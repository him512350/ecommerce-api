import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// One row per user — maintained as a running total for fast balance reads.
@Entity('user_points')
export class UserPoints {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  @Index()
  userId: string;

  // Current redeemable balance
  @Column({ name: 'balance', default: 0 })
  balance: number;

  @Column({ name: 'lifetime_earned', default: 0 })
  lifetimeEarned: number;

  @Column({ name: 'lifetime_redeemed', default: 0 })
  lifetimeRedeemed: number;

  @Column({ name: 'lifetime_expired', default: 0 })
  lifetimeExpired: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
