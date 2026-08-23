import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

// price_alert / deal / recommendation / order_update / system
export type NotificationType = 'price_alert' | 'deal' | 'recommendation' | 'order_update' | 'system';
// app / email / sms / push
export type NotificationChannel = 'app' | 'email' | 'sms' | 'push';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, (user) => user.notifications, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 30 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  // Dữ liệu bổ sung: product_id, order_id, url...
  @Column({ type: 'json', nullable: true })
  data: Record<string, any> | null;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'varchar', length: 20, default: 'app' })
  channel: NotificationChannel;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

