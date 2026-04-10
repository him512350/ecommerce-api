import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

@Entity('reviews')
@Unique(['productId', 'userId']) // one review per product per user
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  @Index()
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'smallint' })
  rating: number; // 1–5

  @Column({ length: 200, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean; // true if reviewer has purchased the product

  @Column({ name: 'is_approved', default: true })
  isApproved: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
