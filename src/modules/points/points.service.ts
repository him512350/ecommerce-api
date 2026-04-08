import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { PointsConfig } from './entities/points-config.entity';
import { PointsRoleConfig } from './entities/points-role-config.entity';
import { UserPoints } from './entities/user-points.entity';
import { PointsTransaction } from './entities/points-transaction.entity';
import { UserTierMembership } from '../tiers/entities/user-tier-membership.entity';
import { UpdatePointsConfigDto, UpsertRoleConfigDto, AdjustPointsDto } from './dto/points.dto';
import { PointsTransactionType } from '../../common/enums';

const DEFAULT_TIER = 'customer';

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    @InjectRepository(PointsConfig)
    private readonly configRepo: Repository<PointsConfig>,
    @InjectRepository(PointsRoleConfig)
    private readonly roleConfigRepo: Repository<PointsRoleConfig>,
    @InjectRepository(UserPoints)
    private readonly userPointsRepo: Repository<UserPoints>,
    @InjectRepository(PointsTransaction)
    private readonly txRepo: Repository<PointsTransaction>,
    @InjectRepository(UserTierMembership)
    private readonly membershipRepo: Repository<UserTierMembership>,
  ) {}

  // ── Admin: global config ──────────────────────────────────────────────────

  async getConfig(): Promise<PointsConfig> {
    const rows = await this.configRepo.find({ take: 1 });
    if (rows.length) return rows[0];
    return this.configRepo.save(this.configRepo.create({}));
  }

  async updateConfig(dto: UpdatePointsConfigDto): Promise<PointsConfig> {
    const config = await this.getConfig();
    Object.assign(config, dto);
    return this.configRepo.save(config);
  }

  // ── Admin: role configs ───────────────────────────────────────────────────

  async getAllRoleConfigs(): Promise<PointsRoleConfig[]> {
    return this.roleConfigRepo.find({ order: { tierName: 'ASC' } });
  }

  async upsertRoleConfig(dto: UpsertRoleConfigDto): Promise<PointsRoleConfig> {
    const existing = await this.roleConfigRepo.findOne({
      where: { tierName: dto.tierName },
    });
    if (existing) {
      Object.assign(existing, dto);
      return this.roleConfigRepo.save(existing);
    }
    return this.roleConfigRepo.save(this.roleConfigRepo.create(dto));
  }

  async deleteRoleConfig(tierName: string): Promise<void> {
    await this.roleConfigRepo.delete({ tierName });
  }

  // ── User wallet ───────────────────────────────────────────────────────────

  async getOrCreateWallet(userId: string): Promise<UserPoints> {
    let wallet = await this.userPointsRepo.findOne({ where: { userId } });
    if (!wallet) {
      wallet = await this.userPointsRepo.save(
        this.userPointsRepo.create({ userId, balance: 0 }),
      );
    }
    return wallet;
  }

  async getWallet(userId: string) {
    const wallet  = await this.getOrCreateWallet(userId);
    const config  = await this.getConfig();
    const roleConfig = await this.getRoleConfigForUser(userId);
    return {
      ...wallet,
      earnRate:       Number(roleConfig.earnRate),
      redemptionRate: Number(roleConfig.redemptionRate),
      expiryDays:     config.expiryDays,
      minToRedeem:    config.minPointsToRedeem,
      maxRedemptionPercent: Number(config.maxRedemptionPercent),
    };
  }

  // ── Admin: manual adjustment ──────────────────────────────────────────────

  async adjustPoints(userId: string, dto: AdjustPointsDto): Promise<PointsTransaction> {
    if (dto.points === 0) throw new BadRequestException('points cannot be zero');

    const wallet = await this.getOrCreateWallet(userId);
    const type =
      dto.points > 0
        ? PointsTransactionType.ADJUSTED_ADD
        : PointsTransactionType.ADJUSTED_DEDUCT;

    if (wallet.balance + dto.points < 0) {
      throw new BadRequestException(
        `Cannot deduct ${Math.abs(dto.points)} pts — user only has ${wallet.balance} pts`,
      );
    }

    return this.writeTransaction({
      userId,
      points:       dto.points,
      type,
      referenceType: 'manual',
      referenceId:   null,
      description:  dto.description ?? (dto.points > 0 ? 'Admin credit' : 'Admin deduction'),
    });
  }

  // ── Earn points (called from PaymentsService after Stripe payment) ────────

  async awardForOrder(
    userId: string,
    orderId: string,
    paidAmount: number,
  ): Promise<void> {
    const config = await this.getConfig();
    if (!config.isEnabled) return;

    const roleConfig = await this.getRoleConfigForUser(userId);
    const points = Math.floor(paidAmount * Number(roleConfig.earnRate));
    if (points <= 0) return;

    const expiresAt =
      config.expiryDays > 0
        ? new Date(Date.now() + config.expiryDays * 86_400_000)
        : null;

    await this.writeTransaction({
      userId,
      points,
      type:          PointsTransactionType.EARNED,
      referenceType: 'order',
      referenceId:   orderId,
      description:   `Earned for order (HK$${paidAmount.toFixed(2)})`,
      expiresAt,
    });

    this.logger.log(`Awarded ${points} pts to user ${userId} for order ${orderId}`);
  }

  // ── Redeem points (called from CartService) ───────────────────────────────

  async validateRedemption(
    userId: string,
    pointsToRedeem: number,
    cartSubtotal: number,
  ): Promise<number> {
    const config     = await this.getConfig();
    const wallet     = await this.getOrCreateWallet(userId);
    const roleConfig = await this.getRoleConfigForUser(userId);

    if (!config.isEnabled) throw new BadRequestException('Points system is not enabled');
    if (wallet.balance < config.minPointsToRedeem) {
      throw new BadRequestException(
        `Minimum ${config.minPointsToRedeem} points required to redeem. You have ${wallet.balance}.`,
      );
    }
    if (pointsToRedeem > wallet.balance) {
      throw new BadRequestException(
        `You only have ${wallet.balance} points. Cannot redeem ${pointsToRedeem}.`,
      );
    }

    // Compute HKD discount
    const rawDiscount = Math.floor(pointsToRedeem / Number(roleConfig.redemptionRate));

    // Cap at max_redemption_percent of subtotal
    const maxDiscount = Math.floor(cartSubtotal * Number(config.maxRedemptionPercent) / 100);
    const finalDiscount = Math.min(rawDiscount, maxDiscount);

    // Recalculate actual points needed for the capped discount
    const actualPoints = Math.ceil(finalDiscount * Number(roleConfig.redemptionRate));
    return actualPoints; // return the capped points to store on cart
  }

  // Deduct points when order is confirmed (called from OrdersService)
  async deductForOrder(
    userId: string,
    orderId: string,
    points: number,
    discountAmount: number,
  ): Promise<void> {
    if (points <= 0) return;
    await this.writeTransaction({
      userId,
      points:        -points,
      type:          PointsTransactionType.REDEEMED,
      referenceType: 'order',
      referenceId:   orderId,
      description:   `Redeemed ${points} pts for HK$${discountAmount.toFixed(2)} discount`,
    });
  }

  // ── Compute points discount value in HKD ──────────────────────────────────

  async computeDiscount(userId: string, points: number): Promise<number> {
    const roleConfig = await this.getRoleConfigForUser(userId);
    return Math.floor(points / Number(roleConfig.redemptionRate));
  }

  // ── Transaction log ───────────────────────────────────────────────────────

  async getTransactions(userId: string, page = 1, limit = 20) {
    const [items, total] = await this.txRepo.findAndCount({
      where:  { userId },
      order:  { createdAt: 'DESC' },
      skip:   (page - 1) * limit,
      take:   limit,
    });
    return { items, total, page, limit };
  }

  async getAllTransactions(page = 1, limit = 20) {
    const [items, total] = await this.txRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip:  (page - 1) * limit,
      take:  limit,
    });
    return { items, total, page, limit };
  }

  // ── Admin stats ───────────────────────────────────────────────────────────

  async getStats() {
    const row = await this.userPointsRepo
      .createQueryBuilder('up')
      .select('SUM(up.balance)',          'totalOutstanding')
      .addSelect('SUM(up.lifetimeEarned)',   'totalEarned')
      .addSelect('SUM(up.lifetimeRedeemed)', 'totalRedeemed')
      .addSelect('SUM(up.lifetimeExpired)',  'totalExpired')
      .addSelect('COUNT(CASE WHEN up.balance > 0 THEN 1 END)', 'activeWallets')
      .getRawOne();
    return {
      totalOutstanding: Number(row?.totalOutstanding ?? 0),
      totalEarned:      Number(row?.totalEarned      ?? 0),
      totalRedeemed:    Number(row?.totalRedeemed    ?? 0),
      totalExpired:     Number(row?.totalExpired     ?? 0),
      activeWallets:    Number(row?.activeWallets    ?? 0),
    };
  }

  // ── Daily cron: expire stale points at 03:00 ──────────────────────────────

  @Cron('0 3 * * *')
  async expirePoints(): Promise<void> {
    this.logger.log('Points expiry cron started');

    const expiredTxs = await this.txRepo.find({
      where: {
        type:       PointsTransactionType.EARNED,
        isExpired:  false,
        expiresAt:  LessThanOrEqual(new Date()),
      },
    });

    const byUser = new Map<string, number>();
    for (const tx of expiredTxs) {
      byUser.set(tx.userId, (byUser.get(tx.userId) ?? 0) + tx.points);
    }

    let processed = 0;
    for (const [userId, totalExpiring] of byUser) {
      const wallet = await this.getOrCreateWallet(userId);
      const deduct = Math.min(totalExpiring, wallet.balance); // never go below 0
      if (deduct > 0) {
        await this.writeTransaction({
          userId,
          points:        -deduct,
          type:          PointsTransactionType.EXPIRED,
          referenceType: 'expiry',
          referenceId:   null,
          description:   `${deduct} points expired`,
        });

        // Update lifetime stats
        wallet.lifetimeExpired += deduct;
        await this.userPointsRepo.save(wallet);
      }
      processed++;
    }

    // Mark processed transactions as expired
    for (const tx of expiredTxs) {
      tx.isExpired = true;
    }
    if (expiredTxs.length) await this.txRepo.save(expiredTxs);

    this.logger.log(`Points expiry done — ${processed} user(s) affected, ${expiredTxs.length} transaction(s) marked`);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async getRoleConfigForUser(userId: string): Promise<PointsRoleConfig> {
    // Get the user's current tier from tier memberships
    const membership = await this.membershipRepo.findOne({ where: { userId } });
    const tierName   = membership?.tierName ?? DEFAULT_TIER;

    const roleConfig = await this.roleConfigRepo.findOne({ where: { tierName } });
    if (roleConfig) return roleConfig;

    // Fall back to customer defaults if no role config exists yet
    const defaultConfig = await this.roleConfigRepo.findOne({
      where: { tierName: DEFAULT_TIER },
    });
    if (defaultConfig) return defaultConfig;

    // Hardcoded baseline so the service always works even before admin setup
    return this.roleConfigRepo.create({ tierName: DEFAULT_TIER, earnRate: 1, redemptionRate: 100 });
  }

  private async writeTransaction(params: {
    userId:        string;
    points:        number;
    type:          string;
    referenceType: string | null;
    referenceId:   string | null;
    description:   string;
    expiresAt?:    Date | null;
  }): Promise<PointsTransaction> {
    const wallet       = await this.getOrCreateWallet(params.userId);
    const newBalance   = wallet.balance + params.points;

    if (newBalance < 0 && params.type !== PointsTransactionType.EXPIRED) {
      throw new BadRequestException('Insufficient points balance');
    }

    // Update running totals
    wallet.balance = Math.max(0, newBalance);
    if (params.points > 0) {
      if (params.type === PointsTransactionType.EARNED)      wallet.lifetimeEarned   += params.points;
      if (params.type === PointsTransactionType.ADJUSTED_ADD) wallet.lifetimeEarned  += params.points;
    } else {
      if (params.type === PointsTransactionType.REDEEMED)     wallet.lifetimeRedeemed += Math.abs(params.points);
      if (params.type === PointsTransactionType.EXPIRED)      wallet.lifetimeExpired  += Math.abs(params.points);
    }
    await this.userPointsRepo.save(wallet);

    return this.txRepo.save(
      this.txRepo.create({
        userId:        params.userId,
        points:        params.points,
        balanceAfter:  wallet.balance,
        type:          params.type,
        referenceType: params.referenceType,
        referenceId:   params.referenceId,
        description:   params.description,
        expiresAt:     params.expiresAt ?? null,
        isExpired:     false,
      }),
    );
  }
}
