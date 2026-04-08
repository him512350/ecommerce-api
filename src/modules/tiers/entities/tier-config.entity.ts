
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UpgradeConditionGroup } from '../interfaces/tier-rules.interface';

@Entity('tier_configs')
export class TierConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Internal identifier used throughout the codebase e.g. "vip", "special_vip"
  @Column({ name: 'tier_name', unique: true, length: 40 })
  tierName: string;

  // Human-readable label shown in dashboard e.g. "VIP", "Special VIP"
  @Column({ name: 'display_name', length: 80 })
  displayName: string;

  // Higher priority = higher tier. Customer = 0 (implicit, no config row needed).
  @Column({ default: 0 })
  priority: number;

  // How long the membership lasts after being granted, in days (e.g. 365).
  @Column({ name: 'membership_duration_days', default: 365 })
  membershipDurationDays: number;

  // Upgrade condition groups — groups combine with OR (any group passing = qualifies).
  // Each group's conditions combine with the group's own operator (AND | OR).
  @Column({ name: 'upgrade_condition_groups', type: 'jsonb', default: '[]' })
  upgradeConditionGroups: UpgradeConditionGroup[];

  // Renewal condition groups — same structure as upgrade.
  // Evaluated when membership is close to / past expiry.
  @Column({ name: 'renewal_condition_groups', type: 'jsonb', default: '[]' })
  renewalConditionGroups: UpgradeConditionGroup[];

  // If true the system can automatically downgrade when membership expires
  // and renewal conditions are not met.
  @Column({ name: 'auto_downgrade', default: true })
  autoDowngrade: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
