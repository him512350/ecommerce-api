import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// Singleton — one row only.  Admin updates via PATCH /points/config.
@Entity('points_config')
export class PointsConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Master on/off switch
  @Column({ name: 'is_enabled', default: false })
  isEnabled: boolean;

  // Days before earned points expire (0 = never)
  @Column({ name: 'expiry_days', default: 365 })
  expiryDays: number;

  // Customer must have at least this many points before they can redeem any
  @Column({ name: 'min_points_to_redeem', default: 100 })
  minPointsToRedeem: number;

  // Cap: points discount cannot exceed this % of the cart subtotal (0–100)
  @Column({ name: 'max_redemption_percent', type: 'decimal', precision: 5, scale: 2, default: 50 })
  maxRedemptionPercent: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
