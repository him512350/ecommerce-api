import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { PromotionUsageLog } from './entities/promotion-usage-log.entity';
import { UserSegment } from '../users/entities/user-segment.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '../../common/utils/pagination.util';
import { PromotionType } from '../../common/enums';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionsRepo: Repository<Promotion>,
    @InjectRepository(PromotionUsageLog)
    private readonly usageLogRepo: Repository<PromotionUsageLog>,
    @InjectRepository(UserSegment)
    private readonly segmentsRepo: Repository<UserSegment>,
  ) {}

  async create(dto: CreatePromotionDto): Promise<Promotion> {
    if (dto.type === PromotionType.COUPON && !dto.code) {
      throw new BadRequestException('Coupon promotions require a code');
    }
    if (dto.code) {
      const exists = await this.promotionsRepo.findOne({
        where: { code: dto.code.toUpperCase() },
      });
      if (exists) throw new BadRequestException('Coupon code already exists');
    }
    const promo = this.promotionsRepo.create({
      ...dto,
      code: dto.code?.toUpperCase(),
    });
    return this.promotionsRepo.save(promo);
  }

  async findAll(pagination: PaginationDto) {
    const qb = this.promotionsRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.conditionGroups', 'cg')
      .leftJoinAndSelect('cg.conditions', 'c')
      .leftJoinAndSelect('p.actions', 'a')
      .orderBy('p.priority', 'DESC')
      .addOrderBy('p.createdAt', 'DESC');

    if (pagination.search) {
      qb.where('p.name ILIKE :s OR p.code ILIKE :s', {
        s: `%${pagination.search}%`,
      });
    }

    return paginate(qb, pagination);
  }

  async findOne(id: string): Promise<Promotion> {
    const promo = await this.promotionsRepo.findOne({
      where: { id },
      relations: ['conditionGroups', 'conditionGroups.conditions', 'actions'],
    });
    if (!promo) throw new NotFoundException('Promotion not found');
    return promo;
  }

  async findOneCoupon(code: string): Promise<Promotion> {
    const promo = await this.promotionsRepo.findOne({
      where: {
        code: code.toUpperCase(),
        type: PromotionType.COUPON,
        isActive: true,
      },
    });
    if (!promo) {
      throw new BadRequestException('Coupon code not found or inactive');
    }
    return promo;
  }

  async deactivate(id: string): Promise<Promotion> {
    const promo = await this.findOne(id);
    promo.isActive = false;
    return this.promotionsRepo.save(promo);
  }

  async activate(id: string): Promise<Promotion> {
    const promo = await this.findOne(id);
    promo.isActive = true;
    return this.promotionsRepo.save(promo);
  }

  async remove(id: string): Promise<void> {
    const promo = await this.findOne(id);
    await this.promotionsRepo.remove(promo);
  }

  async getUsageLogs(id: string, pagination: PaginationDto) {
    const qb = this.usageLogRepo
      .createQueryBuilder('log')
      .where('log.promotionId = :id', { id })
      .orderBy('log.createdAt', 'DESC');
    return paginate(qb, pagination);
  }

  async addUserSegment(
    userId: string,
    segment: string,
    expiresAt?: Date,
  ): Promise<UserSegment> {
    const existing = await this.segmentsRepo.findOne({
      where: { userId, segment },
    });
    if (existing) {
      existing.expiresAt = expiresAt ?? null;
      return this.segmentsRepo.save(existing);
    }
    return this.segmentsRepo.save(
      this.segmentsRepo.create({
        userId,
        segment,
        expiresAt: expiresAt ?? null,
      }),
    );
  }

  async removeUserSegment(userId: string, segment: string): Promise<void> {
    await this.segmentsRepo.delete({ userId, segment });
  }

  async getUserSegments(userId: string): Promise<UserSegment[]> {
    return this.segmentsRepo.find({ where: { userId } });
  }
}
