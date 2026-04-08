import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TierConfig } from './entities/tier-config.entity';
import { UserTierMembership } from './entities/user-tier-membership.entity';
import { UserTierHistory } from './entities/user-tier-history.entity';
import { UserSegment } from '../users/entities/user-segment.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';
import { EmailType, PaymentStatus } from '../../common/enums';
import {
  TierChangeReason,
  UpgradeCondition,
  UpgradeConditionGroup,
} from './interfaces/tier-rules.interface';

const BASE_TIER = 'customer';
const BASE_PRIORITY = 0;

@Injectable()
export class TierEvaluationService {
  private readonly logger = new Logger(TierEvaluationService.name);

  constructor(
    @InjectRepository(TierConfig)
    private readonly tierConfigRepo: Repository<TierConfig>,
    @InjectRepository(UserTierMembership)
    private readonly membershipRepo: Repository<UserTierMembership>,
    @InjectRepository(UserTierHistory)
    private readonly historyRepo: Repository<UserTierHistory>,
    @InjectRepository(UserSegment)
    private readonly segmentRepo: Repository<UserSegment>,
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Called immediately after a Stripe payment succeeds.
   * Checks whether the user now qualifies for a higher tier.
   */
  async evaluateAfterPayment(
    userId: string,
    orderId: string,
    paidAmount: number,
  ): Promise<void> {
    try {
      await this.runUpgradeCheck(userId, orderId, paidAmount);
    } catch (err) {
      // Never block payment flow — log and swallow
      this.logger.error(`Tier evaluation failed for user ${userId}: ${err.message}`);
    }
  }

  /**
   * Admin-triggered manual override — bypasses all conditions.
   */
  async manualOverride(
    userId: string,
    tierName: string,
    adminId: string,
    expiresAt?: Date,
    reason?: string,
  ): Promise<UserTierMembership> {
    const membership = await this.getOrCreateMembership(userId);
    const fromTier = membership.tierName;

    if (tierName === BASE_TIER) {
      return this.downgradeToBase(userId, 'admin_reset', `admin:${adminId}`, null, {
        reason: reason ?? 'Admin reset',
      });
    }

    const config = await this.tierConfigRepo.findOne({ where: { tierName } });
    if (!config) throw new Error(`Tier config "${tierName}" not found`);

    const now = new Date();
    const expiry =
      expiresAt ??
      new Date(now.getTime() + config.membershipDurationDays * 86_400_000);

    return this.applyTierChange(userId, config, null, expiry, `admin:${adminId}`, {
      fromTier,
      reason: reason ?? 'Admin override',
    }, 'admin_upgrade');
  }

  /**
   * Returns or creates the membership record for a user.
   */
  async getOrCreateMembership(userId: string): Promise<UserTierMembership> {
    let membership = await this.membershipRepo.findOne({ where: { userId } });
    if (!membership) {
      membership = this.membershipRepo.create({
        userId,
        tierName: BASE_TIER,
        tierConfigId: null,
        startedAt: new Date(),
        expiresAt: null,
        upgradedBy: 'system',
        qualifyingOrderId: null,
      });
      await this.membershipRepo.save(membership);
    }
    return membership;
  }

  // ── Cron: daily at 02:00 ──────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyEvaluation(): Promise<void> {
    this.logger.log('Daily tier evaluation started');
    await this.processExpirations();
    this.logger.log('Daily tier evaluation complete');
  }

  // ── Upgrade check (triggered by payment) ─────────────────────────────────

  private async runUpgradeCheck(
    userId: string,
    orderId: string,
    singleOrderAmount: number,
  ): Promise<void> {
    const membership = await this.getOrCreateMembership(userId);
    const currentPriority = await this.getTierPriority(membership.tierName);

    // Load all active tier configs ordered highest-tier first
    const configs = await this.tierConfigRepo.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });

    for (const config of configs) {
      // Skip tiers the user is already at or above
      if (config.priority <= currentPriority) continue;

      const { qualifies, reason, meta } = await this.checkUpgradeConditions(
        userId,
        config,
        singleOrderAmount,
      );

      if (qualifies) {
        const now = new Date();
        const expiresAt = new Date(
          now.getTime() + config.membershipDurationDays * 86_400_000,
        );
        await this.applyTierChange(
          userId,
          config,
          orderId,
          expiresAt,
          'system',
          { ...meta, singleOrderAmount },
          reason,
        );
        break; // Upgrade to highest qualifying tier only
      }
    }
  }

  // ── Expiration + renewal check ────────────────────────────────────────────

  private async processExpirations(): Promise<void> {
    const now = new Date();

    // Find all memberships that have expired (non-base tier)
    const expired = await this.membershipRepo
      .createQueryBuilder('m')
      .where('m.tierName != :base', { base: BASE_TIER })
      .andWhere('m.expiresAt IS NOT NULL')
      .andWhere('m.expiresAt <= :now', { now })
      .getMany();

    for (const membership of expired) {
      await this.handleExpiredMembership(membership);
    }
  }

  private async handleExpiredMembership(
    membership: UserTierMembership,
  ): Promise<void> {
    const config = await this.tierConfigRepo.findOne({
      where: { tierName: membership.tierName },
    });

    if (!config || !config.autoDowngrade) return;

    // Check renewal conditions
    const { qualifies, meta } = await this.checkRenewalConditions(
      membership.userId,
      config,
    );

    if (qualifies) {
      // Renew for another term
      const newExpiry = new Date(
        Date.now() + config.membershipDurationDays * 86_400_000,
      );
      membership.startedAt = new Date();
      membership.expiresAt = newExpiry;
      await this.membershipRepo.save(membership);
      await this.writeHistory(membership.userId, membership.tierName, membership.tierName, 'renewal', 'cron', null, meta);
      this.logger.log(`Renewed ${membership.tierName} for user ${membership.userId}`);
    } else {
      // Downgrade — find next lower active tier, or reset to base
      const lowerTier = await this.findNextLowerTier(config.priority);
      if (lowerTier) {
        const newExpiry = new Date(
          Date.now() + lowerTier.membershipDurationDays * 86_400_000,
        );
        await this.applyTierChange(
          membership.userId,
          lowerTier,
          null,
          newExpiry,
          'cron',
          { expired: true },
          'expiry_downgrade',
        );
      } else {
        await this.downgradeToBase(membership.userId, 'expiry_downgrade', 'cron', null, { expired: true });
      }
    }
  }

  // ── Condition evaluation ──────────────────────────────────────────────────

  private async checkUpgradeConditions(
    userId: string,
    config: TierConfig,
    singleOrderAmount: number,
  ): Promise<{ qualifies: boolean; reason: TierChangeReason; meta: Record<string, any> }> {
    for (const group of config.upgradeConditionGroups) {
      const { passed, reason, meta } = await this.evaluateGroup(
        userId,
        group,
        singleOrderAmount,
      );
      if (passed) return { qualifies: true, reason, meta };
    }
    return { qualifies: false, reason: 'single_order_upgrade', meta: {} };
  }

  private async checkRenewalConditions(
    userId: string,
    config: TierConfig,
  ): Promise<{ qualifies: boolean; meta: Record<string, any> }> {
    for (const group of config.renewalConditionGroups) {
      const { passed, meta } = await this.evaluateGroup(userId, group, 0);
      if (passed) return { qualifies: true, meta };
    }
    return { qualifies: false, meta: {} };
  }

  private async evaluateGroup(
    userId: string,
    group: UpgradeConditionGroup,
    singleOrderAmount: number,
  ): Promise<{ passed: boolean; reason: TierChangeReason; meta: Record<string, any> }> {
    const results = await Promise.all(
      group.conditions.map((c) => this.evaluateCondition(userId, c, singleOrderAmount)),
    );

    const allMeta = Object.assign({}, ...results.map((r) => r.meta));
    const allReasons = results.filter((r) => r.passed).map((r) => r.reason);

    if (group.operator === 'AND') {
      const passed = results.every((r) => r.passed);
      return { passed, reason: allReasons[0] ?? 'single_order_upgrade', meta: allMeta };
    }
    const passed = results.some((r) => r.passed);
    return { passed, reason: allReasons[0] ?? 'single_order_upgrade', meta: allMeta };
  }

  private async evaluateCondition(
    userId: string,
    condition: UpgradeCondition,
    singleOrderAmount: number,
  ): Promise<{ passed: boolean; reason: TierChangeReason; meta: Record<string, any> }> {
    switch (condition.type) {
      case 'single_order_amount': {
        const passed = singleOrderAmount >= (condition.minAmount ?? 0);
        return {
          passed,
          reason: 'single_order_upgrade',
          meta: { singleOrderAmount, threshold: condition.minAmount },
        };
      }

      case 'cumulative_amount_in_days': {
        const since = new Date();
        since.setDate(since.getDate() - (condition.withinDays ?? 90));
        const row = await this.ordersRepo
          .createQueryBuilder('o')
          .select('COALESCE(SUM(o.total), 0)', 'total')
          .where('o.userId = :userId', { userId })
          .andWhere('o.paymentStatus = :status', { status: PaymentStatus.PAID })
          .andWhere('o.createdAt >= :since', { since })
          .getRawOne<{ total: string }>();
        const cumulative = Number(row?.total ?? 0);
        const passed = cumulative >= (condition.minAmount ?? 0);
        return {
          passed,
          reason: 'cumulative_upgrade',
          meta: { cumulative, threshold: condition.minAmount, withinDays: condition.withinDays },
        };
      }

      case 'order_count_in_days': {
        const since = new Date();
        since.setDate(since.getDate() - (condition.withinDays ?? 90));
        const count = await this.ordersRepo.count({
          where: {
            userId,
            paymentStatus: PaymentStatus.PAID,
            createdAt: MoreThanOrEqual(since),
          },
        });
        const passed = count >= (condition.minCount ?? 1);
        return {
          passed,
          reason: 'order_count_upgrade',
          meta: { count, threshold: condition.minCount, withinDays: condition.withinDays },
        };
      }

      case 'manual':
        // Never auto-evaluated; only via manualOverride()
        return { passed: false, reason: 'admin_upgrade', meta: {} };

      default:
        return { passed: false, reason: 'single_order_upgrade', meta: {} };
    }
  }

  // ── State mutation helpers ────────────────────────────────────────────────

  private async applyTierChange(
    userId: string,
    config: TierConfig,
    orderId: string | null,
    expiresAt: Date,
    upgradedBy: string,
    meta: Record<string, any>,
    reason: TierChangeReason,
  ): Promise<UserTierMembership> {
    const membership = await this.getOrCreateMembership(userId);
    const fromTier = membership.tierName;

    membership.tierName = config.tierName;
    membership.tierConfigId = config.id;
    membership.startedAt = new Date();
    membership.expiresAt = expiresAt;
    membership.upgradedBy = upgradedBy;
    membership.qualifyingOrderId = orderId;
    await this.membershipRepo.save(membership);

    // Keep user_segments in sync so promotion engine can target by tier
    await this.syncSegment(userId, fromTier, config.tierName);

    await this.writeHistory(userId, fromTier, config.tierName, reason, upgradedBy, orderId, meta);

    // Send upgrade email — fire-and-forget
    this.usersRepo.findOne({ where: { id: userId } }).then((user) => {
      if (!user) return;
      const expiresAt = new Date(Date.now() + config.membershipDurationDays * 86_400_000);
      this.emailService.send(EmailType.TIER_UPGRADED, user.email, {
        first_name: user.firstName ?? '',
        tier_name:  config.displayName,
        expires_at: expiresAt.toLocaleDateString('en-HK', { year: 'numeric', month: 'long', day: 'numeric' }),
        store_name: 'My Store',
        year:       String(new Date().getFullYear()),
      }).catch((err) => this.logger.error(`Tier upgrade email failed: ${err.message}`));
    }).catch(() => {});

    this.logger.log(`User ${userId}: ${fromTier} → ${config.tierName} (${reason})`);

    return membership;
  }

  private async downgradeToBase(
    userId: string,
    reason: TierChangeReason,
    changedBy: string,
    orderId: string | null,
    meta: Record<string, any>,
  ): Promise<UserTierMembership> {
    const membership = await this.getOrCreateMembership(userId);
    const fromTier = membership.tierName;

    membership.tierName = BASE_TIER;
    membership.tierConfigId = null;
    membership.startedAt = new Date();
    membership.expiresAt = null;
    membership.upgradedBy = changedBy;
    membership.qualifyingOrderId = orderId;
    await this.membershipRepo.save(membership);

    await this.syncSegment(userId, fromTier, BASE_TIER);
    await this.writeHistory(userId, fromTier, BASE_TIER, reason, changedBy, orderId, meta);

    return membership;
  }

  private async syncSegment(
    userId: string,
    fromTier: string,
    toTier: string,
  ): Promise<void> {
    // Remove old tier segment
    if (fromTier !== BASE_TIER) {
      await this.segmentRepo.delete({ userId, segment: fromTier });
    }
    // Add new tier segment
    if (toTier !== BASE_TIER) {
      const existing = await this.segmentRepo.findOne({
        where: { userId, segment: toTier },
      });
      if (!existing) {
        await this.segmentRepo.save(
          this.segmentRepo.create({ userId, segment: toTier }),
        );
      }
    }
  }

  private async writeHistory(
    userId: string,
    fromTier: string | null,
    toTier: string,
    reason: TierChangeReason,
    changedBy: string,
    orderId: string | null,
    meta: Record<string, any> | null,
  ): Promise<void> {
    await this.historyRepo.save(
      this.historyRepo.create({
        userId,
        fromTier: fromTier ?? null,
        toTier,
        reason,
        changedBy,
        qualifyingOrderId: orderId,
        meta,
      }),
    );
  }

  private async getTierPriority(tierName: string): Promise<number> {
    if (tierName === BASE_TIER) return BASE_PRIORITY;
    const config = await this.tierConfigRepo.findOne({ where: { tierName } });
    return config?.priority ?? BASE_PRIORITY;
  }

  private async findNextLowerTier(currentPriority: number): Promise<TierConfig | null> {
    return this.tierConfigRepo
      .createQueryBuilder('tc')
      .where('tc.isActive = true')
      .andWhere('tc.priority < :p', { p: currentPriority })
      .orderBy('tc.priority', 'DESC')
      .getOne();
  }
}
