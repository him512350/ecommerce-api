import {
  JoinColumn,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from './user.entity';

@Entity('user_addresses')
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 50, nullable: true })
  label: string; // e.g. "Home", "Office"

  @Column({ name: 'street_line1', length: 255 })
  streetLine1: string;

  @Column({ name: 'street_line2', length: 255, nullable: true })
  streetLine2: string;

  @Column({ length: 100 })
  city: string;

  @Column({ length: 100, nullable: true })
  state: string;

  @Column({ name: 'postal_code', length: 20 })
  postalCode: string;

  @Column({ length: 2 }) // ISO 3166-1 alpha-2
  country: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
