import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from './product.entity';

export type PriceAlertStatus = 'active' | 'triggered' | 'cancelled';
export type NotifyChannel = 'app' | 'email' | 'sms';

@Entity('price_alerts')
export class PriceAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, (user) => user.price_alerts, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  product_id: string;

  @ManyToOne(() => Product, (product) => product.price_alerts, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // Ngưỡng giá mong muốn
  @Column({ type: 'bigint' })
  target_price: number;

  // active / triggered / cancelled
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: PriceAlertStatus;

  // app / email / sms
  @Column({ type: 'varchar', length: 30, default: 'app' })
  notify_channel: NotifyChannel;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  triggered_at: Date | null;
}

