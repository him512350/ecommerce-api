import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BundleGroup } from './bundle-group.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('bundle_group_items')
export class BundleGroupItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_id' })
  groupId: string;

  @ManyToOne(() => BundleGroup, (g) => g.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: BundleGroup;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // If set, only this specific variant is included / selectable
  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId: string | null;

  @ManyToOne(() => ProductVariant, { nullable: true, eager: true })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  // How many units of this item are included when selected
  @Column({ default: 1 })
  quantity: number;

  // Pre-selected for the customer (can still be deselected if is_optional=true)
  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  // Can the customer deselect / choose not to include this item?
  @Column({ name: 'is_optional', default: true })
  isOptional: boolean;

  // Extra charge (or discount if negative) added to bundle price when selected.
  // Only used when pricingType = CALCULATED or DISCOUNTED.
  @Column({
    name: 'price_modifier',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  priceModifier: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}
