import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ActionType, ActionTarget } from '../../../common/enums';
import { Promotion } from './promotion.entity';

@Entity('promotion_actions')
export class PromotionAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'promotion_id' })
  promotionId: string;

  @ManyToOne(() => Promotion, (p) => p.actions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion;

  @Column({ type: 'enum', enum: ActionType })
  type: ActionType;

  // For percentage / fixed / fixed_price actions — the numeric amount.
  // percentage_discount: 0–100
  // fixed_discount: HKD amount
  // fixed_price: target price in HKD
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  value: number;

  @Column({ type: 'enum', enum: ActionTarget, default: ActionTarget.ORDER })
  target: ActionTarget;

  // JSONB config for complex actions. Examples per action type:
  //
  // bogo: {
  //   buy_qty: 2,
  //   get_qty: 1,
  //   get_discount_pct: 100,        // 100 = free
  //   get_target: "cheapest",       // "cheapest" | "specific"
  //   buy_product_ids: ["uuid"],    // optional — if empty, any product qualifies
  //   buy_category_ids: ["uuid"],   // optional
  //   get_product_ids: ["uuid"],    // required when get_target === "specific"
  // }
  //
  // tiered_discount: {
  //   tiers: [
  //     { min_amount: 500,  discount_pct: 5  },
  //     { min_amount: 1000, discount_pct: 10 },
  //     { min_amount: 2000, discount_pct: 15 },
  //   ]
  // }
  //
  // free_gift: {
  //   product_id: "uuid",
  //   variant_id: "uuid",   // optional
  //   quantity: 1,
  // }
  //
  // percentage_discount / fixed_discount with target=category:
  //   { category_ids: ["uuid1", "uuid2"] }
  //
  // percentage_discount / fixed_discount with target=specific_products:
  //   { product_ids: ["uuid1"] }
  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}
