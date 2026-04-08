import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ShippingMethod } from './shipping-method.entity';

@Entity('shipping_zones')
export class ShippingZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Admin label e.g. "Hong Kong", "Asia Pacific", "Worldwide"
  @Column({ length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // ISO 3166-1 alpha-2 codes e.g. ["HK","MO"].
  // Use ["*"] as a catch-all that matches any country not covered by another zone.
  @Column({ type: 'jsonb', default: '[]' })
  countries: string[];

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ShippingMethod, (m) => m.zone, { cascade: true, eager: true })
  methods: ShippingMethod[];
}
