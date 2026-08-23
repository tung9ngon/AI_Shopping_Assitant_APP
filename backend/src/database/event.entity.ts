import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';

// searched / viewed / recommended / compared / added_to_cart / skipped / purchased / wishlisted
// — added_to_cart/purchased luôn do NGƯỜI DÙNG tự bấm nút, hệ thống chỉ ghi log
export type EventType =
  | 'searched'
  | 'viewed'
  | 'recommended'
  | 'compared'
  | 'added_to_cart'
  | 'skipped'
  | 'purchased'
  | 'wishlisted';

// search / recommendation / browse / chat
export type EventSource = 'search' | 'recommendation' | 'browse' | 'chat';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // NULL = guest user
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  // NULL nếu event đến từ trang chủ/browse, không qua chat
  @Column({ type: 'uuid', nullable: true })
  conversation_id: string | null;

  @ManyToOne(() => Conversation, (conversation) => conversation.events, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation | null;

  // event phát sinh từ message nào (nếu có)
  @Column({ type: 'uuid', nullable: true })
  message_id: string | null;

  @ManyToOne(() => Message, (message) => message.events, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'message_id' })
  message: Message | null;

  @Column({ type: 'varchar', length: 30 })
  event_type: EventType;

  // Một hoặc nhiều product ID liên quan tới event
  @Column({ type: 'json', nullable: true })
  product_ids: string[] | null;

  // cho biết event xảy ra ở đâu (trang chủ, kết quả tìm kiếm, hay trong chat)
  @Column({ type: 'varchar', length: 30, nullable: true })
  source: EventSource | null;

  // Dữ liệu chi tiết tuỳ event_type: raw_query, parsed_intent, result_count (searched);
  // duration_ms (viewed); score, rank, reason, was_clicked (recommended);
  // ai_summary, chosen_product_id (compared)
  @Column({ type: 'json', nullable: true })
  payload: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

