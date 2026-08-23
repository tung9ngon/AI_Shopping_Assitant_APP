import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';

// cod / payos
export type PaymentMethod = 'cod' | 'payos';
// pending / success / failed / refunded
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

// 1 đơn hàng có 1 thanh toán
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  order_id: string;

  @OneToOne(() => Order, (order) => order.payment, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'varchar', length: 30 })
  method: PaymentMethod;

  // Mã giao dịch: với payos, lúc khởi tạo tạm lưu orderCode (số) để đối chiếu webhook,
  // sau khi thanh toán thành công sẽ ghi đè bằng "reference" (mã giao dịch ngân hàng thật)
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  transaction_id: string | null;

  // Số tiền thanh toán (VNĐ)
  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'VND' })
  currency: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: PaymentStatus;

  // Raw response từ cổng thanh toán (dùng để đối soát/debug)
  @Column({ type: 'json', nullable: true })
  gateway_response: Record<string, any> | null;

  // Số tiền đã hoàn (nếu có)
  @Column({ type: 'bigint', nullable: true })
  refunded_amount: number | null;

  // Thời điểm thanh toán thành công
  @Column({ type: 'timestamp', nullable: true })
  paid_at: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}