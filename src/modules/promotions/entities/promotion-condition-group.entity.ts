import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GroupOperator } from '../../../common/enums';
import { Promotion } from './promotion.entity';
import { PromotionCondition } from './promotion-condition.entity';

@Entity('promotion_condition_groups')
export class PromotionConditionGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'promotion_id' })
  promotionId: string;

  @ManyToOne(() => Promotion, (p) => p.conditionGroups, { onDelete: 'CASCADE' })
  promotion: Promotion;

  // How conditions inside this group combine with each other
  @Column({ type: 'enum', enum: GroupOperator, default: GroupOperator.AND })
  operator: GroupOperator;

  // Groups themselves always combine with AND across all groups in a promotion
  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @OneToMany(() => PromotionCondition, (c) => c.group, {
    cascade: true,
    eager: true,
  })
  conditions: PromotionCondition[];
}
