import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ConditionType, ComparisonOperator } from '../../../common/enums';
import { PromotionConditionGroup } from './promotion-condition-group.entity';

@Entity('promotion_conditions')
export class PromotionCondition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_id' })
  groupId: string;

  @ManyToOne(() => PromotionConditionGroup, (g) => g.conditions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'group_id' })
  group: PromotionConditionGroup;

  @Column({ type: 'enum', enum: ConditionType })
  type: ConditionType;

  @Column({ type: 'enum', enum: ComparisonOperator })
  operator: ComparisonOperator;

  // Flexible value: a number, boolean, string[], or object stored as JSONB.
  // Examples:
  //   cart_subtotal gte 500         → value: 500
  //   category_ids  in  [uuid, …]   → value: ["uuid1","uuid2"]
  //   first_order_only eq true      → value: true
  //   day_of_week      in  [0,6]    → value: [0, 6]
  //   time_of_day      eq  {...}    → value: { start:"09:00", end:"18:00" }
  @Column({ type: 'jsonb' })
  value: any;
}
