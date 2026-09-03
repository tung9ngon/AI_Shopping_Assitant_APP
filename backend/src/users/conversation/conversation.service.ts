import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Conversation } from '../../database/conversation.entity';
import { Message } from '../../database/message.entity';
import { CreateConversationDto, SendMessageDto, QueryMessagesDto } from './conversation.dto';
import { ChatService } from '../chat/chat.service';
import { ChatMessageDto } from '../chat/chat.dto';

// Số tin nhắn cũ gửi kèm cho Gemini làm ngữ cảnh. Cắt bớt để phiên dài không làm
// phình payload và chi phí mỗi lượt.
const HISTORY_LIMIT = 20;

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation) private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    private readonly chatService: ChatService,
  ) {}

  // Ai được đụng vào một cuộc hội thoại:
  //   - Phiên đã có chủ (user_id): đúng chủ đó, không ai khác.
  //   - Phiên của khách (user_id NULL): đúng THIẾT BỊ đã tạo ra nó, nhận diện bằng
  //     cookie httpOnly `guest_id`. Trước đây chỉ cần biết id là vào được, tức là ai
  //     nhặt được id trong log/lịch sử request cũng đọc được cả hội thoại.
  private assertCanAccess(
    conversation: Conversation,
    requesterId: string | null,
    guestId: string | null,
  ) {
    const allowed =
      conversation.user_id !== null
        ? conversation.user_id === requesterId
        : conversation.guest_id !== null && conversation.guest_id === guestId;

    if (!allowed) {
      throw new ForbiddenException('Bạn không có quyền truy cập cuộc hội thoại này');
    }
  }

  // ---------- POST /api/conversations ----------
  // `guestId` chỉ dùng khi chưa đăng nhập — đã đăng nhập thì chủ sở hữu là tài khoản.
  async create(userId: string | null, guestId: string | null, dto: CreateConversationDto) {
    const conversation = this.conversationRepo.create({
      user_id: userId,
      guest_id: userId ? null : guestId,
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
  async findOne(id: string, requesterId: string | null, guestId: string | null) {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    this.assertCanAccess(conversation, requesterId, guestId);

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
  async sendMessage(
    id: string,
    requesterId: string | null,
    guestId: string | null,
    dto: SendMessageDto,
  ) {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    this.assertCanAccess(conversation, requesterId, guestId);

    // Lấy lịch sử TRƯỚC khi lưu tin nhắn mới — ChatService nhận câu hỏi hiện tại
    // riêng qua `message`, gửi kèm cả trong history sẽ thành hỏi hai lần.
    const history = await this.buildHistory(conversation.id);

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
    let reply: Awaited<ReturnType<ConversationService['generateAssistantReply']>>;
    try {
      reply = await this.generateAssistantReply(conversation, dto.content, history);
    } catch (err) {
      // Gemini hỏng (thiếu API key, quá tải...) thì bỏ luôn tin nhắn vừa lưu: để lại
      // câu hỏi không có câu trả lời sẽ thành một lỗ hổng trong lịch sử, và lượt sau
      // vẫn gửi câu đó lên như ngữ cảnh.
      await this.messageRepo.delete({ id: userMessage.id });
      throw err;
    }

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
  async getMessages(
    id: string,
    requesterId: string | null,
    guestId: string | null,
    query: QueryMessagesDto,
  ) {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    this.assertCanAccess(conversation, requesterId, guestId);

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

  // ---------- POST /api/conversations/claim ----------
  // Gán các phiên khách của thiết bị này cho tài khoản vừa đăng nhập. Hỏi lúc chưa đăng
  // nhập rồi mới đăng nhập thì phiên đó không còn mất dấu: nó hiện luôn trong
  // GET /conversations.
  //
  // Xoá `guest_id` sau khi gán để cookie cũ không còn kéo theo được phiên nào — nếu
  // không, người tiếp theo đăng nhập trên cùng máy sẽ nhận luôn phiên của người trước.
  async claim(userId: string, guestId: string | null) {
    if (!guestId) return { claimed: 0 };

    const result = await this.conversationRepo.update(
      { user_id: IsNull(), guest_id: guestId },
      { user_id: userId, guest_id: null },
    );

    return { claimed: result.affected ?? 0 };
  }

  // Lịch sử cho Gemini: chỉ text, đúng vai 'user' | 'model'. Lấy HISTORY_LIMIT tin gần
  // nhất (query DESC rồi đảo lại) để phiên dài vẫn còn đúng thứ tự thời gian.
  private async buildHistory(conversationId: string): Promise<ChatMessageDto[]> {
    const recent = await this.messageRepo.find({
      where: { conversation_id: conversationId },
      order: { created_at: 'DESC' },
      take: HISTORY_LIMIT,
    });

    return recent
      .reverse()
      .map((m) => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.content }));
  }

  // ---------- Sinh câu trả lời của agent ----------
  // Dùng chung ChatService với POST /api/chat: cùng một Gemini, cùng công cụ
  // search_products. Khác ở chỗ nhóm này LƯU lại hội thoại, còn /api/chat thì không.
  // AI chỉ tư vấn & gợi ý, KHÔNG tự thêm giỏ hàng / thanh toán thay người dùng.
  private async generateAssistantReply(
    conversation: Conversation,
    userContent: string,
    history: ChatMessageDto[],
  ): Promise<{
    content: string;
    message_type: 'text' | 'product_card' | 'comparison_table';
    metadata: Record<string, any> | null;
    next_step: Conversation['current_step'];
  }> {
    const { reply, products } = await this.chatService.chat({
      message: userContent,
      history,
    });

    const hasProducts = products.length > 0;

    return {
      content: reply,
      // Lưu nguyên danh sách sản phẩm Gemini vừa tra: mở lại phiên cũ vẫn thấy đúng
      // các sản phẩm đã gợi ý, không phải tra lại (giá có thể đã đổi từ lúc đó).
      message_type: hasProducts ? 'product_card' : 'text',
      metadata: hasProducts ? { products } : null,
      next_step: hasProducts ? 'recommend' : conversation.current_step,
    };
  }
}