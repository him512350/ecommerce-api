import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// One row per user per year — prevents duplicate sends
@Entity('birthday_coupon_logs')
@Index(['userId', 'year'], { unique: true })
export class BirthdayCouponLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  // Calendar year the coupon was issued (prevents duplicate per year)
  @Column()
  year: number;

  // The generated unique coupon code e.g. BDAY-A1B2C3-2026
  @Column({ name: 'coupon_code', length: 60 })
  couponCode: string;

  // FK to promotions table (the actual coupon record)
  @Column({ name: 'promotion_id', type: 'uuid', nullable: true })
  promotionId: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt: Date;
}
