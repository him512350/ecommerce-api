import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { PromotionUsageLog } from './entities/promotion-usage-log.entity';
import { UserSegment } from '../users/entities/user-segment.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import {
  ActionTarget,
  ActionType,
  ComparisonOperator,
  ConditionType,
  GroupOperator,
  PromotionType,
  StackableMode,
} from '../../common/enums';
import {
  AppliedPromotion,
  CartPricingResult,
  GiftItem,
  ItemPricing,
} from './interfaces/cart-pricing.interface';
import { PromotionConditionGroup } from './entities/promotion-condition-group.entity';
import { PromotionCondition } from './entities/promotion-condition.entity';
import { PromotionAction } from './entities/promotion-action.entity';
import { Order } from '../orders/entities/order.entity';

interface EvalContext {
  cart: Cart;
  userId: string;
  userSegments: string[];
  isFirstOrder: boolean;
  orderCount: number;
  subtotal: number;
  now: Date;
}

const TAX_RATE = 0.0; // HK has no GST — set > 0 if needed

@Injectable()
export class PromotionEngineService {
  private readonly logger = new Logger(PromotionEngineService.name);

  constructor(
    @InjectRepository(Promotion)
    private readonly promotionsRepo: Repository<Promotion>,
    @InjectRepository(PromotionUsageLog)
    private readonly usageLogRepo: Repository<PromotionUsageLog>,
    @InjectRepository(UserSegment)
    private readonly segmentsRepo: Repository<UserSegment>,
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
  ) {}

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Main evaluation entry point.
   * Runs the full promotion pipeline for a cart and returns full pricing.
   * couponCode is optional — pass it from the cart's stored coupon_code field.
   */
  async evaluate(
    cart: Cart,
    userId: string,
    couponCode?: string,
  ): Promise<CartPricingResult> {
    const now = new Date();
    const [userSegments, orderCount] = await Promise.all([
      this.getUserSegments(userId, now),
      this.getOrderCount(userId),
    ]);

    const subtotal = this.computeSubtotal(cart);
    const context: EvalContext = {
      cart,
      userId,
      userSegments,
      isFirstOrder: orderCount === 0,
      orderCount,
      subtotal,
      now,
    };

    // Collect all candidate promotions (automatic + optional coupon)
    const candidates = await this.collectCandidates(now, couponCode);

    // Track discounts per line item: cartItemId → discount amount
    const itemDiscounts = new Map<string, number>();
    const giftItems: GiftItem[] = [];
    const appliedPromotions: AppliedPromotion[] = [];
    let shippingDiscount = 0;
    let exclusiveApplied = false;

    for (const promo of candidates) {
      if (exclusiveApplied) break;

      // ── Condition check ────────────────────────────────────────
      if (!this.checkConditions(promo, context)) continue;

      // ── Usage limit check ──────────────────────────────────────
      if (!(await this.checkUsageLimits(promo, userId))) continue;

      // ── Stacking rule ──────────────────────────────────────────
      if (promo.stackable === StackableMode.NONE) exclusiveApplied = true;

      // ── Execute actions ────────────────────────────────────────
      let promoDiscount = 0;

      for (const action of promo.actions.sort(
        (a, b) => a.sortOrder - b.sortOrder,
      )) {
        const result = this.executeAction(action, context, itemDiscounts);
        promoDiscount += result.itemDiscount ?? 0;
        shippingDiscount += result.shippingDiscount ?? 0;
        if (result.giftItems?.length) giftItems.push(...result.giftItems);
      }

      appliedPromotions.push({
        promotionId: promo.id,
        promotionName: promo.name,
        code: promo.code ?? undefined,
        discountAmount: promoDiscount,
        actionType: promo.actions[0]?.type ?? ActionType.PERCENTAGE_DISCOUNT,
      });

      this.logger.log(
        `Promotion "${promo.name}" applied — discount HKD ${promoDiscount.toFixed(2)}`,
      );
    }

    return this.buildPricingResult(
      cart,
      itemDiscounts,
      giftItems,
      shippingDiscount,
      appliedPromotions,
      subtotal,
    );
  }

  /**
   * Validate that a coupon code exists and is currently active.
   * Throws BadRequestException with a clear reason on any failure.
   * Does NOT check usage limits (those run in evaluate()).
   */
  async validateCouponCode(code: string): Promise<Promotion> {
    const promo = await this.promotionsRepo.findOne({
      where: {
        code: code.toUpperCase(),
        type: PromotionType.COUPON,
        isActive: true,
      },
    });
    if (!promo)
      throw new BadRequestException('Coupon code not found or inactive');

    const now = new Date();
    if (promo.startsAt && now < promo.startsAt)
      throw new BadRequestException('Coupon is not yet active');
    if (promo.expiresAt && now > promo.expiresAt)
      throw new BadRequestException('Coupon has expired');

    return promo;
  }

  /**
   * Record a usage log row after an order is confirmed.
   * Also increments the global used_count counter.
   */
  async recordUsage(
    promotionId: string,
    userId: string,
    orderId: string,
    discountAmount: number,
  ): Promise<void> {
    await this.usageLogRepo.save(
      this.usageLogRepo.create({
        promotionId,
        userId,
        orderId,
        discountAmount,
      }),
    );
    await this.promotionsRepo.increment({ id: promotionId }, 'usedCount', 1);
  }

  // ── Candidate collection ──────────────────────────────────────────────────

  private async collectCandidates(
    now: Date,
    couponCode?: string,
  ): Promise<Promotion[]> {
    const qb = this.promotionsRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.conditionGroups', 'cg')
      .leftJoinAndSelect('cg.conditions', 'c')
      .leftJoinAndSelect('p.actions', 'a')
      .where('p.isActive = true')
      .andWhere('(p.startsAt IS NULL OR p.startsAt <= :now)', { now })
      .andWhere('(p.expiresAt IS NULL OR p.expiresAt >= :now)', { now })
      .andWhere('p.type = :auto', { auto: PromotionType.AUTOMATIC })
      .orderBy('p.priority', 'DESC');

    const automatics = await qb.getMany();

    const candidates: Promotion[] = [...automatics];

    if (couponCode) {
      const coupon = await this.promotionsRepo
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.conditionGroups', 'cg')
        .leftJoinAndSelect('cg.conditions', 'c')
        .leftJoinAndSelect('p.actions', 'a')
        .where('p.code = :code', { code: couponCode.toUpperCase() })
        .andWhere('p.isActive = true')
        .andWhere('(p.startsAt IS NULL OR p.startsAt <= :now)', { now })
        .andWhere('(p.expiresAt IS NULL OR p.expiresAt >= :now)', { now })
        .getOne();

      if (coupon) candidates.push(coupon);
    }

    return candidates;
  }

  // ── Condition evaluation ──────────────────────────────────────────────────

  private checkConditions(promo: Promotion, ctx: EvalContext): boolean {
    if (!promo.conditionGroups?.length) return true; // no conditions = always passes

    // All groups combine with AND
    return promo.conditionGroups
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .every((group) => this.evaluateGroup(group, ctx));
  }

  private evaluateGroup(
    group: PromotionConditionGroup,
    ctx: EvalContext,
  ): boolean {
    if (!group.conditions?.length) return true;

    if (group.operator === GroupOperator.AND) {
      return group.conditions.every((c) => this.evaluateCondition(c, ctx));
    }
    return group.conditions.some((c) => this.evaluateCondition(c, ctx));
  }

  private evaluateCondition(
    cond: PromotionCondition,
    ctx: EvalContext,
  ): boolean {
    switch (cond.type) {
      case ConditionType.CART_SUBTOTAL:
        return this.compareNumber(
          ctx.subtotal,
          cond.operator,
          Number(cond.value),
        );

      case ConditionType.CART_QUANTITY: {
        const totalQty = ctx.cart.items.reduce((s, i) => s + i.quantity, 0);
        return this.compareNumber(totalQty, cond.operator, Number(cond.value));
      }

      case ConditionType.CART_ITEM_COUNT:
        return this.compareNumber(
          ctx.cart.items.length,
          cond.operator,
          Number(cond.value),
        );

      case ConditionType.PRODUCT_IDS: {
        const cartProductIds = ctx.cart.items.map((i) => i.productId);
        return this.compareArrayIntersection(
          cartProductIds,
          cond.operator,
          cond.value as string[],
        );
      }

      case ConditionType.CATEGORY_IDS: {
        const cartCategoryIds = ctx.cart.items
          .map((i) => i.product?.categoryId)
          .filter(Boolean) as string[];
        return this.compareArrayIntersection(
          cartCategoryIds,
          cond.operator,
          cond.value as string[],
        );
      }

      case ConditionType.CUSTOMER_SEGMENT:
        return this.compareArrayIntersection(
          ctx.userSegments,
          cond.operator,
          cond.value as string[],
        );

      case ConditionType.FIRST_ORDER_ONLY:
        return ctx.isFirstOrder === Boolean(cond.value);

      case ConditionType.MIN_ORDER_COUNT:
        return this.compareNumber(
          ctx.orderCount,
          cond.operator,
          Number(cond.value),
        );

      case ConditionType.DAY_OF_WEEK: {
        const day = ctx.now.getDay(); // 0=Sun…6=Sat
        return (cond.value as number[]).includes(day);
      }

      case ConditionType.TIME_OF_DAY: {
        const { start, end } = cond.value as { start: string; end: string };
        const now = ctx.now.toTimeString().slice(0, 5); // "HH:MM"
        return now >= start && now <= end;
      }

      default:
        this.logger.warn(`Unknown condition type: ${cond.type}`);
        return true;
    }
  }

  // ── Usage limit check ─────────────────────────────────────────────────────

  private async checkUsageLimits(
    promo: Promotion,
    userId: string,
  ): Promise<boolean> {
    // Global limit
    if (promo.maxUses !== null && promo.maxUses !== undefined) {
      if (promo.usedCount >= promo.maxUses) return false;
    }

    // Per-customer limit
    if (
      promo.maxUsesPerCustomer !== null &&
      promo.maxUsesPerCustomer !== undefined
    ) {
      const customerUses = await this.usageLogRepo.count({
        where: { promotionId: promo.id, userId },
      });
      if (customerUses >= promo.maxUsesPerCustomer) return false;
    }

    return true;
  }

  // ── Action execution ──────────────────────────────────────────────────────

  private executeAction(
    action: PromotionAction,
    ctx: EvalContext,
    itemDiscounts: Map<string, number>,
  ): {
    itemDiscount?: number;
    shippingDiscount?: number;
    giftItems?: GiftItem[];
  } {
    switch (action.type) {
      case ActionType.PERCENTAGE_DISCOUNT:
        return this.applyPercentageDiscount(action, ctx, itemDiscounts);

      case ActionType.FIXED_DISCOUNT:
        return this.applyFixedDiscount(action, ctx, itemDiscounts);

      case ActionType.FIXED_PRICE:
        return this.applyFixedPrice(action, ctx, itemDiscounts);

      case ActionType.FREE_SHIPPING:
        return this.applyFreeShipping(ctx);

      case ActionType.BOGO:
        return this.applyBogo(action, ctx, itemDiscounts);

      case ActionType.TIERED_DISCOUNT:
        return this.applyTieredDiscount(action, ctx, itemDiscounts);

      case ActionType.FREE_GIFT:
        return this.applyFreeGift(action, ctx);

      default:
        return {};
    }
  }

  // percentage_discount ──────────────────────────────────────────────────────
  private applyPercentageDiscount(
    action: PromotionAction,
    ctx: EvalContext,
    itemDiscounts: Map<string, number>,
  ) {
    const pct = Number(action.value) / 100;
    let itemDiscount = 0;

    const targetItems = this.resolveTargetItems(action, ctx.cart.items);

    for (const item of targetItems) {
      const lineTotal = Number(item.unitPrice) * item.quantity;
      const discount = +(lineTotal * pct).toFixed(2);
      this.addItemDiscount(itemDiscounts, item.id, discount);
      itemDiscount += discount;
    }

    return { itemDiscount };
  }

  // fixed_discount ───────────────────────────────────────────────────────────
  private applyFixedDiscount(
    action: PromotionAction,
    ctx: EvalContext,
    itemDiscounts: Map<string, number>,
  ) {
    const fixedAmount = Number(action.value);

    if (action.target === ActionTarget.ORDER) {
      // Spread discount proportionally across all line items
      const itemDiscount = Math.min(fixedAmount, ctx.subtotal);
      const ratio = itemDiscount / ctx.subtotal;

      for (const item of ctx.cart.items) {
        const lineTotal = Number(item.unitPrice) * item.quantity;
        const discount = +(lineTotal * ratio).toFixed(2);
        this.addItemDiscount(itemDiscounts, item.id, discount);
      }
      return { itemDiscount };
    }

    // Target-specific fixed discount
    const targetItems = this.resolveTargetItems(action, ctx.cart.items);
    const targetTotal = targetItems.reduce(
      (s, i) => s + Number(i.unitPrice) * i.quantity,
      0,
    );
    const itemDiscount = Math.min(fixedAmount, targetTotal);
    const ratio = targetTotal > 0 ? itemDiscount / targetTotal : 0;

    for (const item of targetItems) {
      const lineTotal = Number(item.unitPrice) * item.quantity;
      const discount = +(lineTotal * ratio).toFixed(2);
      this.addItemDiscount(itemDiscounts, item.id, discount);
    }

    return { itemDiscount };
  }

  // fixed_price ──────────────────────────────────────────────────────────────
  private applyFixedPrice(
    action: PromotionAction,
    ctx: EvalContext,
    itemDiscounts: Map<string, number>,
  ) {
    const fixedPrice = Number(action.value);
    let itemDiscount = 0;

    const targetItems = this.resolveTargetItems(action, ctx.cart.items);
    for (const item of targetItems) {
      const currentUnitPrice = Number(item.unitPrice);
      if (currentUnitPrice > fixedPrice) {
        const discount = (currentUnitPrice - fixedPrice) * item.quantity;
        this.addItemDiscount(itemDiscounts, item.id, +discount.toFixed(2));
        itemDiscount += +discount.toFixed(2);
      }
    }

    return { itemDiscount };
  }

  // free_shipping ────────────────────────────────────────────────────────────
  private applyFreeShipping(_ctx: EvalContext) {
    // Return a large sentinel so CartService's Math.min(discount, actualCost)
    // always zeroes out whatever shipping method the customer has selected.
    return { shippingDiscount: 999_999 };
  }

  // bogo ─────────────────────────────────────────────────────────────────────
  private applyBogo(
    action: PromotionAction,
    ctx: EvalContext,
    itemDiscounts: Map<string, number>,
  ) {
    const cfg = action.config ?? {};
    const buyQty = Number(cfg.buy_qty ?? 1);
    const getQty = Number(cfg.get_qty ?? 1);
    const getDiscountPct = Number(cfg.get_discount_pct ?? 100) / 100; // 100 = free
    const getTarget = cfg.get_target ?? 'cheapest'; // 'cheapest' | 'specific'
    const buyProductIds = (cfg.buy_product_ids as string[] | undefined) ?? [];
    const buyCategoryIds = (cfg.buy_category_ids as string[] | undefined) ?? [];
    const getProductIds = (cfg.get_product_ids as string[] | undefined) ?? [];

    // Identify buy-side qualifying items
    const qualifyingItems = ctx.cart.items.filter((item) => {
      if (buyProductIds.length && buyProductIds.includes(item.productId))
        return true;
      if (
        buyCategoryIds.length &&
        item.product?.categoryId &&
        buyCategoryIds.includes(item.product.categoryId)
      )
        return true;
      if (!buyProductIds.length && !buyCategoryIds.length) return true; // any product qualifies
      return false;
    });

    const qualifyingQty = qualifyingItems.reduce((s, i) => s + i.quantity, 0);
    const rewardCycles = Math.floor(qualifyingQty / buyQty);
    const freeUnits = rewardCycles * getQty;

    if (freeUnits === 0) return {};

    // get_target === 'specific' → inject gift items (different products)
    if (getTarget === 'specific' && getProductIds.length) {
      const giftItems: GiftItem[] = getProductIds.map((productId) => ({
        productId,
        quantity: freeUnits,
        promotionId: action.promotionId,
        promotionName: '', // filled by caller
      }));
      return { giftItems };
    }

    // get_target === 'cheapest' (or 'most_expensive') → discount items in-cart
    const sorted = [...qualifyingItems].sort((a, b) => {
      const diff = Number(a.unitPrice) - Number(b.unitPrice);
      return getTarget === 'most_expensive' ? -diff : diff;
    });

    let remaining = freeUnits;
    let itemDiscount = 0;

    for (const item of sorted) {
      if (remaining <= 0) break;
      const discountableUnits = Math.min(item.quantity, remaining);
      const discount = +(
        Number(item.unitPrice) *
        discountableUnits *
        getDiscountPct
      ).toFixed(2);
      this.addItemDiscount(itemDiscounts, item.id, discount);
      itemDiscount += discount;
      remaining -= discountableUnits;
    }

    return { itemDiscount };
  }

  // tiered_discount ──────────────────────────────────────────────────────────
  private applyTieredDiscount(
    action: PromotionAction,
    ctx: EvalContext,
    itemDiscounts: Map<string, number>,
  ) {
    const tiers: Array<{ min_amount: number; discount_pct: number }> = (
      action.config?.tiers ?? []
    ).sort(
      (a: any, b: any) => b.min_amount - a.min_amount, // highest first
    );

    const applicableTier = tiers.find((t) => ctx.subtotal >= t.min_amount);
    if (!applicableTier) return {};

    const fakeAction = {
      ...action,
      type: ActionType.PERCENTAGE_DISCOUNT,
      value: applicableTier.discount_pct,
      target: ActionTarget.ORDER,
    } as PromotionAction;

    return this.applyPercentageDiscount(fakeAction, ctx, itemDiscounts);
  }

  // free_gift ────────────────────────────────────────────────────────────────
  private applyFreeGift(action: PromotionAction, ctx: EvalContext) {
    const cfg = action.config ?? {};
    if (!cfg.product_id) return {};

    const giftItems: GiftItem[] = [
      {
        productId: cfg.product_id as string,
        variantId: cfg.variant_id as string | undefined,
        quantity: Number(cfg.quantity ?? 1),
        promotionId: action.promotionId,
        promotionName: '',
      },
    ];

    return { giftItems };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private resolveTargetItems(
    action: PromotionAction,
    items: CartItem[],
  ): CartItem[] {
    switch (action.target) {
      case ActionTarget.ORDER:
        return items;

      case ActionTarget.CHEAPEST_ITEM: {
        const sorted = [...items].sort(
          (a, b) => Number(a.unitPrice) - Number(b.unitPrice),
        );
        return sorted.length ? [sorted[0]] : [];
      }

      case ActionTarget.MOST_EXPENSIVE: {
        const sorted = [...items].sort(
          (a, b) => Number(b.unitPrice) - Number(a.unitPrice),
        );
        return sorted.length ? [sorted[0]] : [];
      }

      case ActionTarget.SPECIFIC_PRODUCTS: {
        const ids: string[] = action.config?.product_ids ?? [];
        return items.filter((i) => ids.includes(i.productId));
      }

      case ActionTarget.CATEGORY: {
        const catIds: string[] = action.config?.category_ids ?? [];
        return items.filter(
          (i) => i.product?.categoryId && catIds.includes(i.product.categoryId),
        );
      }

      default:
        return items;
    }
  }

  private addItemDiscount(
    map: Map<string, number>,
    itemId: string,
    amount: number,
  ) {
    map.set(itemId, (map.get(itemId) ?? 0) + amount);
  }

  private computeSubtotal(cart: Cart): number {
    return (cart.items ?? []).reduce(
      (s, i) => s + Number(i.unitPrice) * i.quantity,
      0,
    );
  }

  private compareNumber(
    actual: number,
    op: ComparisonOperator,
    target: number,
  ): boolean {
    switch (op) {
      case ComparisonOperator.GTE:
        return actual >= target;
      case ComparisonOperator.LTE:
        return actual <= target;
      case ComparisonOperator.EQ:
        return actual === target;
      default:
        return false;
    }
  }

  private compareArrayIntersection(
    actual: string[],
    op: ComparisonOperator,
    target: string[],
  ): boolean {
    const hasIntersection = actual.some((v) => target.includes(v));
    if (op === ComparisonOperator.IN) return hasIntersection;
    if (op === ComparisonOperator.NOT_IN) return !hasIntersection;
    return false;
  }

  private buildPricingResult(
    cart: Cart,
    itemDiscounts: Map<string, number>,
    giftItems: GiftItem[],
    shippingDiscount: number,
    appliedPromotions: AppliedPromotion[],
    subtotal: number,
  ): CartPricingResult {
    const itemPricings: ItemPricing[] = (cart.items ?? []).map((item) => {
      const lineTotal = Number(item.unitPrice) * item.quantity;
      const discountAmount = +(itemDiscounts.get(item.id) ?? 0).toFixed(2);
      return {
        cartItemId: item.id,
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        productName: item.product?.name ?? '',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: +lineTotal.toFixed(2),
        discountAmount,
        finalTotal: +(lineTotal - discountAmount).toFixed(2),
      };
    });

    const itemDiscountTotal = +itemPricings
      .reduce((s, i) => s + i.discountAmount, 0)
      .toFixed(2);
    const taxAmount = +((subtotal - itemDiscountTotal) * TAX_RATE).toFixed(2);

    // Shipping cost and final total are computed by CartService using the
    // real ShippingCalculatorService. The engine only signals whether a
    // free_shipping promotion is active via shippingDiscount.
    return {
      itemPricings,
      giftItems,
      subtotal: +subtotal.toFixed(2),
      itemDiscountTotal,
      availableShipping: [], // filled in by CartService
      shippingCost: 0, // overridden by CartService
      shippingDiscount: Math.min(shippingDiscount, 999_999),
      taxAmount,
      total: +(subtotal - itemDiscountTotal + taxAmount).toFixed(2),
      appliedPromotions,
      selectedShippingMethodId: null, // overridden by CartService
    };
  }

  private async getUserSegments(userId: string, now: Date): Promise<string[]> {
    const rows = await this.segmentsRepo
      .createQueryBuilder('s')
      .where('s.userId = :userId', { userId })
      .andWhere('(s.expiresAt IS NULL OR s.expiresAt > :now)', { now })
      .getMany();
    return rows.map((r) => r.segment);
  }

  private async getOrderCount(userId: string): Promise<number> {
    return this.ordersRepo.count({ where: { userId } });
  }
}
