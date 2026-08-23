import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { Event } from './event.entity';

export type MessageSender = 'user' | 'agent';
export type MessageType = 'text' | 'product_card' | 'comparison_table';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  conversation_id: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  // user / agent
  @Column({ type: 'varchar', length: 10 })
  sender: MessageSender;

  @Column({ type: 'text' })
  content: string;

  // text / product_card / comparison_table — AI chỉ hiển thị sản phẩm gợi ý
  // kèm nút 'Thêm vào giỏ' như trang chủ, KHÔNG tự thực hiện hành động
  @Column({ type: 'varchar', length: 20, default: 'text' })
  message_type: MessageType;

  // Dữ liệu kèm theo loại message: product_ids, parsed_intent,
  // comparison_data, score, reason...
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @OneToMany(() => Event, (event) => event.message)
  events: Event[];
}

