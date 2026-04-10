import {
  JoinColumn,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, (p) => p.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ length: 200 })
  name: string; // e.g. "Red / Large"

  @Column({ length: 100, unique: true })
  @Index()
  sku: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({
    name: 'compare_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  comparePrice: number;

  @Column({ name: 'inventory_quantity', default: 0 })
  inventoryQuantity: number;

  @Column({ type: 'jsonb', nullable: true })
  options: Record<string, string>; // e.g. { color: "Red", size: "L" }

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
