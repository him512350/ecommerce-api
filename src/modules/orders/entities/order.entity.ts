import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Address } from '../../users/entities/address.entity';
import { Coupon } from '../../coupons/entities/coupon.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { OrderStatus, PaymentStatus } from '../../../common/enums';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_number', unique: true, length: 20 })
  @Index()
  orderNumber: string; // e.g. "ORD-20240101-0001"

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  taxAmount: number;

  @Column({
    name: 'shipping_cost',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  shippingCost: number;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ name: 'shipping_address_id', nullable: true })
  shippingAddressId: string;

  @ManyToOne(() => Address, { nullable: true })
  @JoinColumn({ name: 'shipping_address_id' })
  shippingAddress: Address;

  @Column({ name: 'coupon_id', nullable: true })
  couponId: string;

  @ManyToOne(() => Coupon, { nullable: true })
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon;

  @Column({ name: 'payment_intent_id', nullable: true, length: 100 })
  paymentIntentId: string; // Stripe PaymentIntent ID

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @OneToOne(() => Payment, (p) => p.order)
  payment: Payment;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
