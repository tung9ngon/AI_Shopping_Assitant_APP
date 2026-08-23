import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Cart } from './cart.entity';
import { Product } from './product.entity';

// cart_id + product_id là duy nhất: 1 sản phẩm chỉ xuất hiện 1 lần trong 1 giỏ hàng
@Entity('cart_items')
@Unique(['cart_id', 'product_id'])
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  cart_id: string;

  @ManyToOne(() => Cart, (cart) => cart.items, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  @Column({ type: 'uuid' })
  product_id: string;

  @ManyToOne(() => Product, (product) => product.cart_items, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @CreateDateColumn({ type: 'timestamp' })
  added_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}