import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// TierChangeReason is imported only as a type for documentation — never used
// as a runtime value on a decorated property (isolatedModules restriction).
import type { TierChangeReason } from '../interfaces/tier-rules.interface';

@Entity('user_tier_histories')
export class UserTierHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ name: 'from_tier', type: 'varchar', nullable: true })
  fromTier: string | null;

  @Column({ name: 'to_tier', length: 40 })
  toTier: string;

  // Stored as varchar; TierChangeReason used only for IDE autocomplete in services.
  @Column({ length: 60 })
  reason: string;

  @Column({ name: 'changed_by', length: 100, default: 'system' })
  changedBy: string;

  @Column({ name: 'qualifying_order_id', type: 'uuid', nullable: true })
  qualifyingOrderId: string | null;

  @Column({ name: 'meta', type: 'jsonb', nullable: true })
  meta: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
