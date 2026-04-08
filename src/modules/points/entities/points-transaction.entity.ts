import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('points_transactions')
export class PointsTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  // positive = credit (earned, adjusted_add, refunded)
  // negative = debit  (redeemed, expired, adjusted_deduct)
  @Column()
  points: number;

  @Column({ name: 'balance_after' })
  balanceAfter: number;

  // One of PointsTransactionType enum values — stored as varchar
  @Column({ length: 30 })
  type: string;

  // 'order' | 'manual' | 'expiry' | 'refund'
  @Column({ name: 'reference_type', type: 'varchar', length: 20, nullable: true })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  // Human-readable note shown to customer and admin
  @Column({ length: 255, nullable: true })
  description: string;

  // Set only on 'earned' transactions — when these points expire
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  // Flipped to true by the expiry cron once these earned points are deducted
  @Column({ name: 'is_expired', default: false })
  isExpired: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
