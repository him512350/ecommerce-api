import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BundlePricingType, BundleType } from '../../../common/enums';
import { Product } from './product.entity';
import { BundleGroup } from './bundle-group.entity';

@Entity('bundle_configs')
export class BundleConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', unique: true })
  productId: string;

  @OneToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'bundle_type', type: 'varchar', length: 20 })
  bundleType: BundleType;

  @Column({ name: 'pricing_type', type: 'varchar', length: 20 })
  pricingType: BundlePricingType;

  // Used when pricingType = DISCOUNTED: percentage off the calculated sum
  @Column({
    name: 'discount_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  discountPercent: number;

  // Total selections across all groups (null = unconstrained)
  @Column({ name: 'min_total_selections', default: 1 })
  minTotalSelections: number;

  @Column({ name: 'max_total_selections', type: 'int', nullable: true })
  maxTotalSelections: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => BundleGroup, (g) => g.bundleConfig, {
    cascade: true,
    eager: true,
  })
  groups: BundleGroup[];
}
