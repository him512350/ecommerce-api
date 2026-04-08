import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShippingZone } from './entities/shipping-zone.entity';
import { ShippingMethod } from './entities/shipping-method.entity';
import { ShippingRate } from './entities/shipping-rate.entity';
import {
  CreateShippingZoneDto,
  CreateShippingMethodDto,
  CreateShippingRateDto,
} from './dto/shipping.dto';

@Injectable()
export class ShippingAdminService {
  constructor(
    @InjectRepository(ShippingZone)
    private readonly zoneRepo: Repository<ShippingZone>,
    @InjectRepository(ShippingMethod)
    private readonly methodRepo: Repository<ShippingMethod>,
    @InjectRepository(ShippingRate)
    private readonly rateRepo: Repository<ShippingRate>,
  ) {}

  // ── Zones ─────────────────────────────────────────────────────────────────

  async createZone(dto: CreateShippingZoneDto): Promise<ShippingZone> {
    return this.zoneRepo.save(this.zoneRepo.create(dto));
  }

  async findAllZones(): Promise<ShippingZone[]> {
    return this.zoneRepo.find({
      relations: ['methods', 'methods.rates'],
      order: { sortOrder: 'ASC' },
    });
  }

  async findZone(id: string): Promise<ShippingZone> {
    const zone = await this.zoneRepo.findOne({
      where: { id },
      relations: ['methods', 'methods.rates'],
    });
    if (!zone) throw new NotFoundException('Shipping zone not found');
    return zone;
  }

  async updateZone(id: string, dto: Partial<CreateShippingZoneDto>): Promise<ShippingZone> {
    const zone = await this.findZone(id);
    Object.assign(zone, dto);
    return this.zoneRepo.save(zone);
  }

  async deleteZone(id: string): Promise<void> {
    const zone = await this.findZone(id);
    await this.zoneRepo.remove(zone);
  }

  // ── Methods ───────────────────────────────────────────────────────────────

  async createMethod(zoneId: string, dto: CreateShippingMethodDto): Promise<ShippingMethod> {
    await this.findZone(zoneId); // ensure zone exists
    return this.methodRepo.save(this.methodRepo.create({ ...dto, zoneId }));
  }

  async findMethod(id: string): Promise<ShippingMethod> {
    const method = await this.methodRepo.findOne({
      where: { id },
      relations: ['rates', 'zone'],
    });
    if (!method) throw new NotFoundException('Shipping method not found');
    return method;
  }

  async updateMethod(id: string, dto: Partial<CreateShippingMethodDto>): Promise<ShippingMethod> {
    const method = await this.findMethod(id);
    Object.assign(method, dto);
    return this.methodRepo.save(method);
  }

  async deleteMethod(id: string): Promise<void> {
    const method = await this.findMethod(id);
    await this.methodRepo.remove(method);
  }

  // ── Rates ─────────────────────────────────────────────────────────────────

  async createRate(methodId: string, dto: CreateShippingRateDto): Promise<ShippingRate> {
    await this.findMethod(methodId); // ensure method exists
    this.validateRateDto(dto);
    return this.rateRepo.save(
      this.rateRepo.create({ ...dto, methodId, cost: dto.cost ?? 0 }),
    );
  }

  async findRate(id: string): Promise<ShippingRate> {
    const rate = await this.rateRepo.findOne({ where: { id } });
    if (!rate) throw new NotFoundException('Shipping rate not found');
    return rate;
  }

  async updateRate(id: string, dto: Partial<CreateShippingRateDto>): Promise<ShippingRate> {
    const rate = await this.findRate(id);
    Object.assign(rate, dto);
    return this.rateRepo.save(rate);
  }

  async deleteRate(id: string): Promise<void> {
    const rate = await this.findRate(id);
    await this.rateRepo.remove(rate);
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private validateRateDto(dto: CreateShippingRateDto): void {
    const { conditionType, conditionMin, conditionMax } = dto;

    if (['order_min', 'item_count_min'].includes(conditionType) && conditionMin == null) {
      throw new BadRequestException(`conditionMin is required for ${conditionType}`);
    }
    if (conditionType === 'order_max' && conditionMax == null) {
      throw new BadRequestException('conditionMax is required for order_max');
    }
    if (conditionType === 'order_between') {
      if (conditionMin == null || conditionMax == null) {
        throw new BadRequestException('Both conditionMin and conditionMax are required for order_between');
      }
      if (conditionMin >= conditionMax) {
        throw new BadRequestException('conditionMin must be less than conditionMax');
      }
    }
  }
}
