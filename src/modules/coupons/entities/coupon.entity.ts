import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CouponType } from '../../../common/enums';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  code: string;

  @Column({ type: 'enum', enum: CouponType })
  type: CouponType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number; // percentage (0–100) or fixed amount

  @Column({
    name: 'min_order_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  minOrderAmount: number;

  @Column({ name: 'max_uses', nullable: true })
  maxUses: number; // null = unlimited

  @Column({ name: 'used_count', default: 0 })
  usedCount: number;

  @Column({ name: 'starts_at', nullable: true })
  startsAt: Date;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
