import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { DiscountCode } from './discount-code.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from './payment.entity';
import { Address } from './address.entity';

export type OrderStatus = 'simulated_success' | 'cancelled' | 'pending' | 'paid' | 'shipped';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, (user) => user.orders, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  cart_id: string | null;

  // Địa chỉ giao hàng
  @Column({ type: 'uuid', nullable: true })
  address_id: string | null;

  @ManyToOne(() => Address, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'address_id' })
  address: Address | null;

  @Column({ type: 'varchar', length: 255 })
  shipping_full_address: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  shipping_recipient_name: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  shipping_phone_number: string | null;

  @Column({ type: 'uuid', nullable: true })
  discount_code_id: string | null;

  @ManyToOne(() => DiscountCode, (discountCode) => discountCode.orders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'discount_code_id' })
  discount_code: DiscountCode | null;

  @Column({ type: 'uuid', nullable: true })
  freeship_code_id: string | null;

  @ManyToOne(() => DiscountCode, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'freeship_code_id' })
  freeship_code: DiscountCode | null;

  @Column({ type: 'bigint' })
  subtotal: number;

  @Column({ type: 'bigint', default: 0 })
  shipping_fee: number;

  @Column({ type: 'bigint', default: 0 })
  discount_amount: number;

  @Column({ type: 'bigint', default: 0 })
  shipping_discount_amount: number;

  @Column({ type: 'bigint' })
  total: number;

  @Column({ type: 'varchar', length: 30, default: 'simulated_success' })
  status: OrderStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @OneToOne(() => Payment, (payment) => payment.order)
  payment: Payment;
}