import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ShippingRateCondition, ShippingRateType } from '../../../common/enums';
import { ShippingMethod } from './shipping-method.entity';

@Entity('shipping_rates')
export class ShippingRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'method_id' })
  methodId: string;

  @ManyToOne(() => ShippingMethod, (m) => m.rates, { onDelete: 'CASCADE' })
  method: ShippingMethod;

  // When this rule fires
  @Column({ name: 'condition_type', type: 'varchar', length: 30 })
  conditionType: ShippingRateCondition;

  // Lower bound for order_min / order_between / item_count_min
  @Column({
    name: 'condition_min',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  conditionMin: number | null;

  // Upper bound for order_max / order_between
  @Column({
    name: 'condition_max',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  conditionMax: number | null;

  // How the cost is calculated
  @Column({ name: 'rate_type', type: 'varchar', length: 20 })
  rateType: ShippingRateType;

  // The cost value: flat HKD, per-item HKD, or percentage (0–100).
  // Ignored when rateType = FREE.
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cost: number;

  // Evaluated top-down; first matching rule wins
  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}
