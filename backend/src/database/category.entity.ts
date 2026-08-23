import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Tên hiển thị: Laptop, Điện thoại...
  @Column({ type: 'varchar', length: 100 })
  name: string;

  // Icon class hoặc emoji
  @Column({ type: 'varchar', nullable: true })
  icon: string | null;

  // property camelCase (dùng trong code) <-> cột snake_case (dùng trong DB)
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}