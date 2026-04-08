import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TierConfig } from './entities/tier-config.entity';
import { UserTierMembership } from './entities/user-tier-membership.entity';
import { UserTierHistory } from './entities/user-tier-history.entity';
import { CreateTierConfigDto } from './dto/create-tier-config.dto';
import { UpdateTierConfigDto } from './dto/update-tier-config.dto';

@Injectable()
export class TierConfigService {
  constructor(
    @InjectRepository(TierConfig)
    private readonly tierConfigRepo: Repository<TierConfig>,
    @InjectRepository(UserTierMembership)
    private readonly membershipRepo: Repository<UserTierMembership>,
    @InjectRepository(UserTierHistory)
    private readonly historyRepo: Repository<UserTierHistory>,
  ) {}

  async create(dto: CreateTierConfigDto): Promise<TierConfig> {
    const exists = await this.tierConfigRepo.findOne({
      where: { tierName: dto.tierName },
    });
    if (exists)
      throw new BadRequestException(`Tier "${dto.tierName}" already exists`);
    // Cast needed because DTO uses `string` for condition.type whereas the
    // interface uses a string-literal union. Both are valid at runtime.
    return this.tierConfigRepo.save(
      this.tierConfigRepo.create(dto as any) as unknown as TierConfig,
    );
  }

  async findAll(): Promise<TierConfig[]> {
    return this.tierConfigRepo.find({ order: { priority: 'ASC' } });
  }

  async findOne(id: string): Promise<TierConfig> {
    const config = await this.tierConfigRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('Tier config not found');
    return config;
  }

  async update(id: string, dto: UpdateTierConfigDto): Promise<TierConfig> {
    const config = await this.findOne(id);
    Object.assign(config, dto);
    return this.tierConfigRepo.save(config);
  }

  async remove(id: string): Promise<void> {
    const config = await this.findOne(id);
    await this.tierConfigRepo.remove(config);
  }

  // ── Membership stats for dashboard ───────────────────────────────────────

  async getMembershipStats(): Promise<Record<string, number>> {
    const rows = await this.membershipRepo
      .createQueryBuilder('m')
      .select('m.tierName', 'tier')
      .addSelect('COUNT(*)', 'count')
      .groupBy('m.tierName')
      .getRawMany<{ tier: string; count: string }>();

    return Object.fromEntries(rows.map((r) => [r.tier, Number(r.count)]));
  }

  async getUsersInTier(tierName: string, page = 1, limit = 20) {
    const [items, total] = await this.membershipRepo.findAndCount({
      where: { tierName },
      relations: ['user'],
      order: { startedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async getUserHistory(userId: string): Promise<UserTierHistory[]> {
    return this.historyRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getUserMembership(userId: string): Promise<UserTierMembership | null> {
    return this.membershipRepo.findOne({
      where: { userId },
      relations: ['tierConfig'],
    });
  }
}
