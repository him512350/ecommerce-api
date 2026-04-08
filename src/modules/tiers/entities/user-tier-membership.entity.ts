import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TierConfig } from './tier-config.entity';

@Entity('user_tier_memberships')
export class UserTierMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // One membership record per user (upserted on tier change).
  @Column({ name: 'user_id', unique: true })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  // "customer" | "vip" | "special_vip" — mirrors TierConfig.tierName.
  // "customer" is the base tier and has no TierConfig row.
  @Column({ name: 'tier_name', length: 40, default: 'customer' })
  tierName: string;

  // Null when user is on the base "customer" tier.
  @Column({ name: 'tier_config_id', type: 'uuid', nullable: true })
  tierConfigId: string | null;

  @ManyToOne(() => TierConfig, { nullable: true, eager: true })
  tierConfig: TierConfig;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  // Null means indefinite (only applies to base customer tier normally).
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  // "system" | "admin" | "order:<orderId>"
  @Column({ name: 'upgraded_by', length: 100, default: 'system' })
  upgradedBy: string;

  // The order that directly triggered this upgrade (if applicable).
  @Column({ name: 'qualifying_order_id', type: 'uuid', nullable: true })
  qualifyingOrderId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  get isExpired(): boolean {
    return this.expiresAt !== null && this.expiresAt < new Date();
  }

  get daysUntilExpiry(): number | null {
    if (!this.expiresAt) return null;
    return Math.ceil((this.expiresAt.getTime() - Date.now()) / 86_400_000);
  }
}
