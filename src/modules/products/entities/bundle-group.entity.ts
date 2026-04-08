import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BundleConfig } from './bundle-config.entity';
import { BundleGroupItem } from './bundle-group-item.entity';

@Entity('bundle_groups')
export class BundleGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'bundle_config_id' })
  bundleConfigId: string;

  @ManyToOne(() => BundleConfig, (bc) => bc.groups, { onDelete: 'CASCADE' })
  bundleConfig: BundleConfig;

  // e.g. "Choose your main item", "Pick your sides", "Optional add-ons"
  @Column({ length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Minimum items the customer must select from this group
  @Column({ name: 'min_selections', default: 1 })
  minSelections: number;

  // Maximum items the customer may select from this group (null = unlimited)
  @Column({ name: 'max_selections', type: 'int', nullable: true })
  maxSelections: number | null;

  // If false, the customer can skip this whole group
  @Column({ name: 'is_required', default: true })
  isRequired: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => BundleGroupItem, (i) => i.group, {
    cascade: true,
    eager: true,
  })
  items: BundleGroupItem[];
}
