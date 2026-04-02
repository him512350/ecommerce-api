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

  // Firebase UID — populated on first login, used to look up the user on every request
  @ApiProperty()
  @Column({ name: 'firebase_uid', unique: true, nullable: true, length: 128 })
  @Index()
  firebaseUid: string;

  @ApiProperty()
  @Column({ unique: true, length: 255 })
  @Index()
  email: string;

  // Nullable — Firebase manages passwords, we no longer store a hash
  @Exclude()
  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @ApiProperty()
  @Column({ name: 'first_name', length: 100, default: '' })
  firstName: string;

  @ApiProperty()
  @Column({ name: 'last_name', length: 100, default: '' })
  lastName: string;

  @ApiProperty({ enum: UserRole })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  @ApiProperty({ required: false })
  @Column({ length: 20, nullable: true })
  phone: string;

  // Profile picture URL from Firebase (Google/social login)
  @ApiProperty({ required: false })
  @Column({ name: 'picture_url', nullable: true })
  pictureUrl: string;

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

  @OneToMany(() => Address, (address) => address.user, { cascade: true })
  addresses: Address[];

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
