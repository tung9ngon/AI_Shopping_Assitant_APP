import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../../database/conversation.entity';
import { Message } from '../../database/message.entity';
import { QueryConversationsAdminDto } from './conversation.admin.dto';

@Injectable()
export class ConversationAdminService {
  constructor(
    @InjectRepository(Conversation) private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
  ) {}

  // ---------- GET /admin/conversations ----------
  async findAll(query: QueryConversationsAdminDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const qb = this.conversationRepo
      .createQueryBuilder('c')
      .leftJoin('c.user', 'u')
      .select([
        'c.id',
        'c.title',
        'c.channel',
        'c.current_step',
        'c.started_at',
        'c.ended_at',
      ])
      // Guest (user_id NULL) -> hiển thị "Khách" thay vì null
      .addSelect("COALESCE(u.full_name, 'Khách')", 'user_name');

    if (query.channel) qb.andWhere('c.channel = :channel', { channel: query.channel });
    if (query.from) qb.andWhere('c.started_at >= :from', { from: query.from });
    if (query.to) qb.andWhere('c.started_at <= :to', { to: query.to });

    qb.orderBy('c.started_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const { entities, raw } = await qb.getRawAndEntities();
    const total = await qb.getCount();

    const data = entities.map((c, i) => ({
      id: c.id,
      user_name: raw[i].user_name,
      title: c.title,
      channel: c.channel,
      current_step: c.current_step,
      started_at: c.started_at,
      ended_at: c.ended_at,
    }));

    return { data, total, page, limit };
  }

  // ---------- GET /admin/conversations/:id ----------
  async findOneDetail(id: string) {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException('Không tìm thấy cuộc hội thoại');

    const messages = await this.messageRepo.find({
      where: { conversation_id: id },
      order: { created_at: 'ASC' },
      select: {
        sender: true,
        content: true,
        message_type: true,
        metadata: true,
        created_at: true,
      },
    });

    return {
      id: conversation.id,
      context: conversation.context,
      messages,
    };
  }
}