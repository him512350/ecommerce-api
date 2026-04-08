import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// One row per tier — admin sets different earn/redemption rates per tier.
// tier_name matches TierConfig.tierName: 'customer' | 'vip' | 'special_vip'
@Entity('points_role_configs')
export class PointsRoleConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Matches TierConfig.tierName or UserRole ('customer' as default)
  @Column({ name: 'tier_name', length: 40, unique: true })
  tierName: string;

  // Points earned per HKD spent — e.g. 1.5 means 1.5 pts per HKD
  @Column({ name: 'earn_rate', type: 'decimal', precision: 8, scale: 4, default: 1 })
  earnRate: number;

  // Points needed to earn HKD 1 discount — e.g. 100 means 100 pts = HK$1
  @Column({ name: 'redemption_rate', type: 'decimal', precision: 10, scale: 4, default: 100 })
  redemptionRate: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
