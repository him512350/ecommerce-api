import {
  JoinColumn,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ShippingZone } from './shipping-zone.entity';
import { ShippingRate } from './shipping-rate.entity';

@Entity('shipping_methods')
export class ShippingMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'zone_id' })
  zoneId: string;

  @ManyToOne(() => ShippingZone, (z) => z.methods, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone: ShippingZone;

  // Shown on checkout page e.g. "Standard Delivery", "Express (Next Day)"
  @Column({ length: 120 })
  name: string;

  // Shown below the method name e.g. "Delivered in 3-5 working days"
  @Column({ type: 'text', nullable: true })
  description: string;

  // e.g. "3-5 working days", "Next working day before 6 pm"
  @Column({ name: 'estimated_days', length: 80, nullable: true })
  estimatedDays: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ShippingRate, (r) => r.method, { cascade: true, eager: true })
  rates: ShippingRate[];
}
