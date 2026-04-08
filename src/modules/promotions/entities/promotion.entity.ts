import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PromotionType, StackableMode } from '../../../common/enums';
import { PromotionConditionGroup } from './promotion-condition-group.entity';
import { PromotionAction } from './promotion-action.entity';
import { PromotionUsageLog } from './promotion-usage-log.entity';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: PromotionType })
  type: PromotionType;

  // Only populated when type === COUPON. Stored uppercase.
  @Column({ nullable: true, unique: true, length: 60 })
  @Index()
  code: string;

  // Higher priority is evaluated first.
  @Column({ default: 0 })
  priority: number;

  @Column({ type: 'enum', enum: StackableMode, default: StackableMode.NONE })
  stackable: StackableMode;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'starts_at', nullable: true })
  startsAt: Date;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt: Date;

  // null = unlimited global uses
  @Column({ name: 'max_uses', nullable: true })
  maxUses: number;

  @Column({ name: 'used_count', default: 0 })
  usedCount: number;

  // null = no per-customer limit
  @Column({ name: 'max_uses_per_customer', nullable: true })
  maxUsesPerCustomer: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ── Relations ──────────────────────────────────────────────────
  @OneToMany(() => PromotionConditionGroup, (g) => g.promotion, {
    cascade: true,
    eager: true,
  })
  conditionGroups: PromotionConditionGroup[];

  @OneToMany(() => PromotionAction, (a) => a.promotion, {
    cascade: true,
    eager: true,
  })
  actions: PromotionAction[];

  @OneToMany(() => PromotionUsageLog, (l) => l.promotion)
  usageLogs: PromotionUsageLog[];
}
