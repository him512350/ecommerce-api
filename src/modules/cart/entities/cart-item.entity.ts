import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Cart } from './cart.entity';
import { Product } from '../../products/entities/product.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

// Stored in CartItem.bundleSelections for bundle products
export interface BundleSelectionItem {
  groupItemId: string;
  productId: string;
  variantId?: string;
  productName: string;
  quantity: number;
  unitPrice: number; // price of this item at add-to-cart time
  priceModifier: number;
}

export interface BundleSelection {
  groupId: string;
  groupName: string;
  items: BundleSelectionItem[];
}

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cart_id' })
  @Index()
  cartId: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId: string | null;

  @ManyToOne(() => ProductVariant, { eager: true, nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @Column({ default: 1 })
  quantity: number;

  // For simple/variable: snapshot of the item's price at add-to-cart time.
  // For bundles: computed bundle price (fixed | sum | sum-discount).
  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  // Populated only for bundle products — stores the customer's selections.
  @Column({ name: 'bundle_selections', type: 'jsonb', nullable: true })
  bundleSelections: BundleSelection[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
