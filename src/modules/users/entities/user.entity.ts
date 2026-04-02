import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums';
import { Address } from './address.entity';

@Entity('users')
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ unique: true, length: 255 })
  @Index()
  email: string;

  @Exclude()
  @Column({ name: 'password_hash' })
  passwordHash: string;

  @ApiProperty()
  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @ApiProperty()
  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @ApiProperty({ enum: UserRole })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  @ApiProperty({ required: false })
  @Column({ length: 20, nullable: true })
  phone: string;

  @ApiProperty()
  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @ApiProperty()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  // ── Relations ──────────────────────────────────────────────────
  @OneToMany(() => Address, (address) => address.user, { cascade: true })
  addresses: Address[];

  // Computed helper
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
