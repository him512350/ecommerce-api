import {
  JoinColumn,
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  @Index()
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'variant_id', nullable: true })
  variantId: string;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @Column({ default: 0 })
  quantity: number;

  @Column({ name: 'reserved_quantity', default: 0 })
  reservedQuantity: number; // held in active carts/orders

  @Column({ name: 'low_stock_threshold', default: 5 })
  lowStockThreshold: number;

  @Column({ name: 'warehouse_location', nullable: true, length: 100 })
  warehouseLocation: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  get availableQuantity(): number {
    return this.quantity - this.reservedQuantity;
  }
}
