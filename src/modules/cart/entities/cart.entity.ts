import {
  Column, CreateDateColumn, Entity, Index,
  ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CartItem } from './cart-item.entity';

@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  user: User;

  @Column({ name: 'session_id', nullable: true, length: 100 })
  sessionId: string;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt: Date;

  @Column({ name: 'coupon_code', type: 'varchar', nullable: true, length: 60 })
  couponCode: string | null;

  @Column({ name: 'coupon_id', type: 'uuid', nullable: true })
  couponId: string | null;

  @Column({ name: 'selected_shipping_method_id', type: 'uuid', nullable: true })
  selectedShippingMethodId: string | null;

  // Points the customer has chosen to redeem at checkout
  @Column({ name: 'redeemed_points', type: 'int', nullable: true })
  redeemedPoints: number | null;

  @OneToMany(() => CartItem, (item) => item.cart, { cascade: true, eager: true })
  items: CartItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  get subtotal(): number {
    return (this.items ?? []).reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity, 0,
    );
  }
}
