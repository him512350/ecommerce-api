import {
  JoinColumn,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Promotion } from './promotion.entity';

@Entity('promotion_usage_logs')
export class PromotionUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'promotion_id' })
  @Index()
  promotionId: string;

  @ManyToOne(() => Promotion, (p) => p.usageLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  // Nullable — logged when promotion is evaluated on cart, confirmed on order
  @Column({ name: 'order_id', nullable: true })
  orderId: string;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2 })
  discountAmount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
