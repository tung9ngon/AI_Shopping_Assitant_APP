import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../../database/conversation.entity';
import { Message } from '../../database/message.entity';
import { CreateConversationDto, SendMessageDto, QueryMessagesDto } from './conversation.dto';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation) private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
  ) {}

  // Guest (userId = null) được xem/nhắn tin trong conversation guest (user_id NULL trong DB).
  // User đã login chỉ được thao tác trên conversation của chính mình.
  // -> chặn user A đọc/nhắn vào conversation của user B.
  private assertCanAccess(conversation: Conversation, requesterId: string | null) {
    if (conversation.user_id !== null && conversation.user_id !== requesterId) {
      throw new ForbiddenException('Bạn không có quyền truy cập cuộc hội thoại này');
    }
  }

  // ---------- POST /api/conversations ----------
  async create(userId: string | null, dto: CreateConversationDto) {
    const conversation = this.conversationRepo.create({
      user_id: userId,
      channel: dto.channel ?? 'chat',
      current_step: 'search',
    });
    await this.conversationRepo.save(conversation);

    return {
      id: conversation.id,
      channel: conversation.channel,
      current_step: conversation.current_step,
      started_at: conversation.started_at,
    };
  }

  // ---------- GET /api/conversations (của tôi -> bắt buộc đăng nhập) ----------
  async findMine(userId: string) {
    const conversations = await this.conversationRepo.find({
      where: { user_id: userId },
      order: { started_at: 'DESC' },
      select: {
        id: true,
        title: true,
        channel: true,
        current_step: true,
        started_at: true,
        ended_at: true,
      },
    });
    return conversations;
  }

  // ---------- GET /api/conversations/:id ----------
  async findOne(id: string, requesterId: string | null) {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    this.assertCanAccess(conversation, requesterId);

    return {
      id: conversation.id,
      title: conversation.title,
      current_step: conversation.current_step,
      context: conversation.context,
      started_at: conversation.started_at,
      ended_at: conversation.ended_at,
    };
  }

  // ---------- POST /api/conversations/:id/messages ----------
  async sendMessage(id: string, requesterId: string | null, dto: SendMessageDto) {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    this.assertCanAccess(conversation, requesterId);

    // 1) Lưu tin nhắn của user
    const userMessage = this.messageRepo.create({
      conversation_id: conversation.id,
      sender: 'user',
      content: dto.content,
      message_type: 'text',
    });
    await this.messageRepo.save(userMessage);

    // Tự sinh title từ tin nhắn đầu tiên nếu chưa có
    if (!conversation.title) {
      conversation.title = dto.content.slice(0, 100);
    }

    // 2) Gọi AI để lấy phản hồi tư vấn.
    // TODO: đây là phần cần nối với engine AI thật (tìm sản phẩm, so sánh, gợi ý...).
    // generateAssistantReply hiện chỉ là stub trả lời tạm, KHÔNG tự thêm giỏ hàng/thanh toán.
    const reply = await this.generateAssistantReply(conversation, dto.content);

    conversation.current_step = reply.next_step;
    await this.conversationRepo.save(conversation);

    const aiMessage = this.messageRepo.create({
      conversation_id: conversation.id,
      sender: 'agent',
      content: reply.content,
      message_type: reply.message_type,
      metadata: reply.metadata,
    });
    await this.messageRepo.save(aiMessage);

    return {
      id: aiMessage.id,
      sender: aiMessage.sender,
      content: aiMessage.content,
      message_type: aiMessage.message_type,
      metadata: aiMessage.metadata,
      created_at: aiMessage.created_at,
    };
  }

  // ---------- GET /api/conversations/:id/messages ----------
  async getMessages(id: string, requesterId: string | null, query: QueryMessagesDto) {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    this.assertCanAccess(conversation, requesterId);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const [data, total] = await this.messageRepo.findAndCount({
      where: { conversation_id: id },
      order: { created_at: 'ASC' },
      select: {
        id: true,
        sender: true,
        content: true,
        message_type: true,
        metadata: true,
        created_at: true,
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  // ---------- Stub AI: THAY BẰNG LOGIC THẬT (search/compare/recommend sản phẩm) ----------
  private async generateAssistantReply(
    conversation: Conversation,
    userContent: string,
  ): Promise<{
    content: string;
    message_type: 'text' | 'product_card' | 'comparison_table';
    metadata: Record<string, any> | null;
    next_step: Conversation['current_step'];
  }> {
    return {
      content:
        'Mình đã ghi nhận yêu cầu của bạn. (Đây là câu trả lời tạm thời — cần nối với engine AI/tìm kiếm sản phẩm thật.)',
      message_type: 'text',
      metadata: null,
      next_step: conversation.current_step,
    };
  }
}