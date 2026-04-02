import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from './entities/coupon.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { CouponType } from '../../common/enums';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponsRepo: Repository<Coupon>,
  ) {}

  async create(dto: CreateCouponDto): Promise<Coupon> {
    const exists = await this.couponsRepo.findOne({
      where: { code: dto.code },
    });
    if (exists) throw new BadRequestException('Coupon code already exists');
    const coupon = this.couponsRepo.create(dto);
    return this.couponsRepo.save(coupon);
  }

  async findAll(): Promise<Coupon[]> {
    return this.couponsRepo.find({ order: { createdAt: 'DESC' } });
  }

  async validate(code: string, subtotal: number): Promise<Coupon> {
    const coupon = await this.couponsRepo.findOne({
      where: { code: code.toUpperCase(), isActive: true },
    });

    if (!coupon) throw new NotFoundException('Coupon not found or inactive');

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new BadRequestException('Coupon is not yet active');
    }
    if (coupon.expiresAt && now > coupon.expiresAt) {
      throw new BadRequestException('Coupon has expired');
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(
        `Minimum order amount is ${coupon.minOrderAmount}`,
      );
    }

    return coupon;
  }

  calculateDiscount(coupon: Coupon, subtotal: number): number {
    if (coupon.type === CouponType.PERCENTAGE) {
      return +((subtotal * Number(coupon.value)) / 100).toFixed(2);
    }
    return Math.min(Number(coupon.value), subtotal); // fixed cannot exceed subtotal
  }

  async incrementUsage(id: string): Promise<void> {
    await this.couponsRepo.increment({ id }, 'usedCount', 1);
  }

  async deactivate(id: string): Promise<Coupon> {
    const coupon = await this.couponsRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    coupon.isActive = false;
    return this.couponsRepo.save(coupon);
  }
}
