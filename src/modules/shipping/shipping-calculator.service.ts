import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShippingZone } from './entities/shipping-zone.entity';
import { ShippingMethod } from './entities/shipping-method.entity';
import { ShippingRate } from './entities/shipping-rate.entity';
import { ShippingRateCondition, ShippingRateType } from '../../common/enums';

export interface ShippingOption {
  methodId: string;
  methodName: string;
  description: string | null;
  estimatedDays: string | null;
  cost: number;
  isFree: boolean;
  zoneId: string;
  zoneName: string;
}

@Injectable()
export class ShippingCalculatorService {
  constructor(
    @InjectRepository(ShippingZone)
    private readonly zoneRepo: Repository<ShippingZone>,
    @InjectRepository(ShippingMethod)
    private readonly methodRepo: Repository<ShippingMethod>,
  ) {}

  /**
   * Returns all available shipping options for a given country and cart.
   * Called by CartService when building CartPricingResult.
   */
  async getOptions(
    countryCode: string,
    subtotal: number,
    itemCount: number,
  ): Promise<ShippingOption[]> {
    const zones = await this.resolveZones(countryCode);
    const options: ShippingOption[] = [];

    for (const zone of zones) {
      const activeMethods = (zone.methods ?? [])
        .filter((m) => m.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      for (const method of activeMethods) {
        const cost = this.evaluateRates(method.rates, subtotal, itemCount);
        if (cost === null) continue; // no matching rule — method unavailable

        options.push({
          methodId:     method.id,
          methodName:   method.name,
          description:  method.description,
          estimatedDays: method.estimatedDays,
          cost,
          isFree:       cost === 0,
          zoneId:       zone.id,
          zoneName:     zone.name,
        });
      }
    }

    return options;
  }

  /**
   * Computes the shipping cost for a specific method ID.
   * Throws if the method is not found or no rule matches.
   */
  async computeCost(
    methodId: string,
    subtotal: number,
    itemCount: number,
  ): Promise<number> {
    const method = await this.methodRepo.findOne({
      where: { id: methodId, isActive: true },
      relations: ['rates'],
    });
    if (!method) throw new NotFoundException(`Shipping method ${methodId} not found`);

    const cost = this.evaluateRates(method.rates, subtotal, itemCount);
    return cost ?? 0;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async resolveZones(countryCode: string): Promise<ShippingZone[]> {
    const allZones = await this.zoneRepo.find({
      where: { isActive: true },
      relations: ['methods', 'methods.rates'],
      order: { sortOrder: 'ASC' },
    });

    // Specific zones (those that explicitly list the country)
    const specific = allZones.filter(
      (z) => z.countries.includes(countryCode) && !z.countries.includes('*'),
    );

    if (specific.length > 0) return specific;

    // Fall back to catch-all zones
    const catchAll = allZones.filter((z) => z.countries.includes('*'));
    return catchAll;
  }

  /**
   * Evaluates rates top-down (sort_order ASC).
   * Returns the cost of the first matching rate, or null if none match.
   */
  private evaluateRates(
    rates: ShippingRate[],
    subtotal: number,
    itemCount: number,
  ): number | null {
    const sorted = [...(rates ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

    for (const rate of sorted) {
      if (!this.conditionMatches(rate, subtotal, itemCount)) continue;
      return this.computeRateCost(rate, subtotal, itemCount);
    }

    return null; // no rule matched
  }

  private conditionMatches(
    rate: ShippingRate,
    subtotal: number,
    itemCount: number,
  ): boolean {
    const min = Number(rate.conditionMin ?? 0);
    const max = Number(rate.conditionMax ?? Infinity);

    switch (rate.conditionType) {
      case ShippingRateCondition.ALWAYS:
        return true;
      case ShippingRateCondition.ORDER_MIN:
        return subtotal >= min;
      case ShippingRateCondition.ORDER_MAX:
        return subtotal < Number(rate.conditionMax ?? Infinity);
      case ShippingRateCondition.ORDER_BETWEEN:
        return subtotal >= min && subtotal < max;
      case ShippingRateCondition.ITEM_COUNT_MIN:
        return itemCount >= min;
      default:
        return false;
    }
  }

  private computeRateCost(
    rate: ShippingRate,
    subtotal: number,
    itemCount: number,
  ): number {
    switch (rate.rateType) {
      case ShippingRateType.FREE:
        return 0;
      case ShippingRateType.FIXED:
        return +Number(rate.cost).toFixed(2);
      case ShippingRateType.PER_ITEM:
        return +(Number(rate.cost) * itemCount).toFixed(2);
      case ShippingRateType.PERCENTAGE:
        return +(subtotal * Number(rate.cost) / 100).toFixed(2);
      default:
        return +Number(rate.cost).toFixed(2);
    }
  }
}
