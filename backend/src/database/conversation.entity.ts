import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Message } from './message.entity';
import { Event } from './event.entity';

export type ConversationChannel = 'chat' | 'voice';
export type ConversationStep = 'search' | 'compare' | 'recommend' | 'done';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // NULL = guest user
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  // Tiêu đề tự sinh từ tin nhắn đầu tiên
  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  // chat / voice
  @Column({ type: 'varchar', length: 20, default: 'chat' })
  channel: ConversationChannel;

  // search / compare / recommend / done — AI CHỈ tư vấn & gợi ý,
  // KHÔNG thêm giỏ hàng / thanh toán thay người dùng
  @Column({ type: 'varchar', length: 30, default: 'search' })
  current_step: ConversationStep;

  // State hội thoại: search_results, filters, compared_items...
  // (gộp từ agent_sessions)
  @Column({ type: 'json', nullable: true })
  context: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  ended_at: Date | null;

  // Cập nhật mỗi khi agent chuyển bước
  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @OneToMany(() => Event, (event) => event.conversation)
  events: Event[];
}
