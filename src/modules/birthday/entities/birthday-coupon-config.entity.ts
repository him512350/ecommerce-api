import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Single-row singleton table — only one config record exists.
// Admin updates it via PATCH /birthday-coupon/config.
@Entity('birthday_coupon_config')
export class BirthdayCouponConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Master switch — when false nothing is sent
  @Column({ name: 'is_enabled', default: false })
  isEnabled: boolean;

  // How many days before the birthday the email is sent (0 = on the day)
  @Column({ name: 'days_before', default: 0 })
  daysBefore: number;

  // 'percentage' or 'fixed_amount'
  @Column({ name: 'coupon_type', type: 'varchar', length: 20, default: 'percentage' })
  couponType: string;

  // Discount value: percent (e.g. 15) or fixed HKD (e.g. 50)
  @Column({ name: 'coupon_value', type: 'decimal', precision: 10, scale: 2, default: 10 })
  couponValue: number;

  // How many days the coupon is valid after being sent (e.g. 30)
  @Column({ name: 'validity_days', default: 30 })
  validityDays: number;

  // Minimum cart subtotal required to use the coupon (0 = no minimum)
  @Column({ name: 'min_order_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  minOrderAmount: number;

  // Email subject — supports {{first_name}}
  @Column({
    name: 'email_subject',
    length: 200,
    default: 'Happy Birthday! Here is your special gift 🎂',
  })
  emailSubject: string;

  // Custom message shown in the email body — supports {{first_name}}, {{coupon_code}}, {{valid_until}}
  @Column({ name: 'email_message', type: 'text', nullable: true })
  emailMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
