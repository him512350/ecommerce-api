import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BirthdayCouponConfig } from './entities/birthday-coupon-config.entity';
import { BirthdayCouponLog } from './entities/birthday-coupon-log.entity';
import { User } from '../users/entities/user.entity';
import { PromotionsService } from '../promotions/promotions.service';
import { EmailService } from '../email/email.service';
import { EmailType } from '../../common/enums';
import { UpdateBirthdayCouponConfigDto } from './dto/birthday-coupon-config.dto';
import {
  ActionTarget,
  ActionType,
  GroupOperator,
  ConditionType,
  ComparisonOperator,
  PromotionType,
  StackableMode,
} from '../../common/enums';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '../../common/utils/pagination.util';

@Injectable()
export class BirthdayCouponService {
  private readonly logger = new Logger(BirthdayCouponService.name);

  constructor(
    @InjectRepository(BirthdayCouponConfig)
    private readonly configRepo: Repository<BirthdayCouponConfig>,
    @InjectRepository(BirthdayCouponLog)
    private readonly logRepo: Repository<BirthdayCouponLog>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly promotionsService: PromotionsService,
    private readonly emailService: EmailService,
  ) {}

  // ── Admin: config CRUD ────────────────────────────────────────────────────

  async getConfig(): Promise<BirthdayCouponConfig> {
    const configs = await this.configRepo.find({ take: 1 });
    if (configs.length > 0) return configs[0];
    // Auto-create default config on first access
    return this.configRepo.save(this.configRepo.create({}));
  }

  async saveConfig(dto: UpdateBirthdayCouponConfigDto): Promise<BirthdayCouponConfig> {
    const config = await this.getConfig();
    Object.assign(config, dto);
    return this.configRepo.save(config);
  }

  // ── Admin: logs ───────────────────────────────────────────────────────────

  async getLogs(pagination: PaginationDto) {
    const qb = this.logRepo
      .createQueryBuilder('log')
      .orderBy('log.sentAt', 'DESC');
    return paginate(qb, pagination);
  }

  // ── Manual trigger (admin testing) ───────────────────────────────────────

  async triggerForUser(userId: string): Promise<{ message: string; couponCode?: string }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.birthday) {
      return { message: 'User has no birthday set — cannot send birthday coupon' };
    }

    const config = await this.getConfig();
    const sent = await this.sendCouponToUser(user, config, true);
    return sent
      ? { message: 'Birthday coupon sent successfully', couponCode: sent }
      : { message: 'Birthday coupon already sent to this user this year' };
  }

  // ── Cron: runs at 08:00 every morning ────────────────────────────────────

  @Cron('0 8 * * *')
  async processDailyBirthdayCoupons(): Promise<void> {
    this.logger.log('Birthday coupon cron started');

    const config = await this.getConfig();
    if (!config.isEnabled) {
      this.logger.log('Birthday coupons disabled — skipping');
      return;
    }

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + config.daysBefore);
    const targetMonth = targetDate.getMonth() + 1; // 1-12
    const targetDay   = targetDate.getDate();       // 1-31

    // Find all active users whose birthday month+day matches the target
    const users = await this.usersRepo
      .createQueryBuilder('u')
      .where('u.birthday IS NOT NULL')
      .andWhere('u.isActive = true')
      .andWhere('u.deletedAt IS NULL')
      .andWhere('EXTRACT(MONTH FROM u.birthday) = :month', { month: targetMonth })
      .andWhere('EXTRACT(DAY   FROM u.birthday) = :day',   { day:   targetDay   })
      .getMany();

    this.logger.log(`Found ${users.length} user(s) with birthday on ${targetMonth}/${targetDay}`);

    let sent = 0;
    let skipped = 0;

    for (const user of users) {
      const code = await this.sendCouponToUser(user, config);
      if (code) sent++;
      else skipped++;
    }

    this.logger.log(`Birthday cron done — sent: ${sent}, skipped (already sent): ${skipped}`);
  }

  // ── Core: generate + send + log ───────────────────────────────────────────

  /**
   * Generates a unique coupon, creates the Promotion, sends the email,
   * and writes a log row. Returns the coupon code, or null if already sent.
   * Pass force=true to send even if a log exists (admin override).
   */
  private async sendCouponToUser(
    user: User,
    config: BirthdayCouponConfig,
    force = false,
  ): Promise<string | null> {
    const year = new Date().getFullYear();

    // Idempotency check — don't send twice in the same calendar year
    if (!force) {
      const existing = await this.logRepo.findOne({
        where: { userId: user.id, year },
      });
      if (existing) return null;
    }

    // ── Generate unique coupon code ──────────────────────────────────────
    // Format: BDAY-{first 6 chars of UUID}-{YEAR}
    // UUID characters are hex so upper-casing is safe and readable
    const shortId = user.id.replace(/-/g, '').substring(0, 6).toUpperCase();
    const code    = `BDAY-${shortId}-${year}`;

    // ── Compute validity window ──────────────────────────────────────────
    const now      = new Date();
    const expiresAt = new Date(now.getTime() + config.validityDays * 86_400_000);

    // ── Build condition groups (min order if set) ────────────────────────
    const conditionGroups: any[] = [];
    if (Number(config.minOrderAmount) > 0) {
      conditionGroups.push({
        operator: GroupOperator.AND,
        conditions: [{
          type:     ConditionType.CART_SUBTOTAL,
          operator: ComparisonOperator.GTE,
          value:    Number(config.minOrderAmount),
        }],
      });
    }

    // ── Create promotion via PromotionsService ───────────────────────────
    const actionType =
      config.couponType === 'percentage'
        ? ActionType.PERCENTAGE_DISCOUNT
        : ActionType.FIXED_DISCOUNT;

    let promotionId: string | null = null;
    try {
      // If a promotion with this code already exists, skip creation
      const existing = await this.promotionsService.findOneCoupon(code).catch(() => null);
      if (existing) {
        promotionId = existing.id;
      } else {
        const promo = await this.promotionsService.create({
          name:                `Birthday coupon — ${user.email} (${year})`,
          type:                PromotionType.COUPON,
          code,
          priority:            5,
          stackable:           StackableMode.NONE,
          isActive:            true,
          startsAt:            now,
          expiresAt,
          maxUses:             1,
          maxUsesPerCustomer:  1,
          conditionGroups,
          actions: [{
            type:   actionType,
            value:  Number(config.couponValue),
            target: ActionTarget.ORDER,
          }],
        });
        promotionId = promo.id;
      }
    } catch (err) {
      this.logger.error(`Failed to create birthday promotion for ${user.email}: ${err.message}`);
    }

    // ── Send email via EmailService (uses DB template + SMTP config) ─────
    const validUntil = expiresAt.toLocaleDateString('en-HK', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const discount =
      config.couponType === 'percentage'
        ? `${Number(config.couponValue).toFixed(0)}% off`
        : `HK$${Number(config.couponValue).toFixed(0)} off`;

    await this.emailService.send(EmailType.BIRTHDAY_COUPON, user.email, {
      first_name:     user.firstName ?? '',
      coupon_code:    code,
      discount,
      valid_until:    validUntil,
      custom_message: config.emailMessage ?? '',
      store_name:     'My Store',
      year:           String(new Date().getFullYear()),
    });

    // ── Write log ────────────────────────────────────────────────────────
    // Upsert: if force=true and a row already exists, update it
    const existingLog = await this.logRepo.findOne({ where: { userId: user.id, year } });
    if (existingLog) {
      existingLog.couponCode   = code;
      existingLog.promotionId  = promotionId;
      existingLog.expiresAt    = expiresAt;
      await this.logRepo.save(existingLog);
    } else {
      await this.logRepo.save(
        this.logRepo.create({ userId: user.id, year, couponCode: code, promotionId, expiresAt }),
      );
    }

    this.logger.log(`Birthday coupon ${code} sent to ${user.email}`);
    return code;
  }
}
