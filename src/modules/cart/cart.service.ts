import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ProductsService } from '../products/products.service';
import { PromotionEngineService } from '../promotions/promotion-engine.service';
import { PromotionsService } from '../promotions/promotions.service';
import { BundleService } from '../products/bundle.service';
import { ShippingCalculatorService } from '../shipping/shipping-calculator.service';
import { PointsService } from '../points/points.service';
import { CartPricingResult } from '../promotions/interfaces/cart-pricing.interface';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    private readonly productsService: ProductsService,
    private readonly promotionEngine: PromotionEngineService,
    private readonly promotionsService: PromotionsService,
    private readonly bundleService: BundleService,
    private readonly shippingCalculator: ShippingCalculatorService,
    private readonly pointsService: PointsService,
  ) {}

  // ── Cart retrieval ────────────────────────────────────────────────────────

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepo.findOne({
      where: { userId },
      relations: ['items', 'items.product', 'items.product.category', 'items.variant'],
    });
    if (!cart) {
      cart = await this.cartRepo.save(this.cartRepo.create({ userId }));
    }
    return cart;
  }

  /**
   * Returns cart + full pricing breakdown including available shipping options.
   * countryCode is used to look up shipping options (pass from frontend or
   * from the user's default address).
   */
  async getCartWithPricing(
    userId: string,
    countryCode = 'HK',
  ): Promise<{ cart: Cart; pricing: CartPricingResult }> {
    const cart = await this.getOrCreateCart(userId);

    // Get promotion-based pricing (discounts, gifts)
    const promoResult = await this.promotionEngine.evaluate(
      cart,
      userId,
      cart.couponCode ?? undefined,
    );

    // Get available shipping options for the country
    const itemCount = (cart.items ?? []).reduce((s, i) => s + i.quantity, 0);
    const availableShipping = await this.shippingCalculator.getOptions(
      countryCode,
      promoResult.subtotal - promoResult.itemDiscountTotal,
      itemCount,
    );

    // Compute actual shipping cost from selected method (if any)
    let shippingCost = 0;
    if (cart.selectedShippingMethodId) {
      const selected = availableShipping.find(
        (s) => s.methodId === cart.selectedShippingMethodId,
      );
      shippingCost = selected ? selected.cost : 0;
    }

    // Apply any free_shipping promotion on top
    const shippingDiscount = Math.min(promoResult.shippingDiscount, shippingCost);
    const netShipping = shippingCost - shippingDiscount;

    // Points discount
    const redeemedPoints = cart.redeemedPoints ?? 0;
    const pointsDiscount = redeemedPoints > 0
      ? await this.pointsService.computeDiscount(userId, redeemedPoints).catch(() => 0)
      : 0;

    const total = +(
      promoResult.subtotal -
      promoResult.itemDiscountTotal -
      pointsDiscount +
      netShipping +
      promoResult.taxAmount
    ).toFixed(2);

    const pricing: CartPricingResult = {
      ...promoResult,
      availableShipping,
      shippingCost: netShipping,
      shippingDiscount,
      redeemedPoints,
      pointsDiscount,
      total: Math.max(0, total),
      selectedShippingMethodId: cart.selectedShippingMethodId,
    };

    return { cart, pricing };
  }

  // ── Shipping method selection ──────────────────────────────────────────────

  async setShippingMethod(
    userId: string,
    methodId: string,
    countryCode = 'HK',
  ): Promise<{ cart: Cart; pricing: CartPricingResult }> {
    const cart = await this.getOrCreateCart(userId);
    const itemCount = (cart.items ?? []).reduce((s, i) => s + i.quantity, 0);

    // Validate the method is available for this cart
    const options = await this.shippingCalculator.getOptions(
      countryCode,
      cart.subtotal,
      itemCount,
    );
    const valid = options.find((o) => o.methodId === methodId);
    if (!valid) {
      throw new BadRequestException('Shipping method not available for this cart');
    }

    await this.cartRepo.update(cart.id, { selectedShippingMethodId: methodId });
    return this.getCartWithPricing(userId, countryCode);
  }

  async clearShippingMethod(userId: string): Promise<void> {
    const cart = await this.getOrCreateCart(userId);
    await this.cartRepo.update(cart.id, { selectedShippingMethodId: null });
  }

  // ── Item management ───────────────────────────────────────────────────────

  async addItem(userId: string, dto: AddCartItemDto): Promise<Cart> {
    const cart    = await this.getOrCreateCart(userId);
    const product = await this.productsService.findOne(dto.productId);
    const qty     = dto.quantity ?? 1;

    if (!product.isActive) throw new BadRequestException('Product is not available');

    if (product.productType === 'bundle') {
      if (!dto.bundleSelections?.length) {
        const defaults = await this.bundleService.getDefaultSelections(product.id);
        dto.bundleSelections = defaults as any;
      }
      const { unitPrice, selections } = await this.bundleService.validateAndPrice(
        product,
        dto.bundleSelections as any,
      );
      await this.cartItemRepo.save(
        this.cartItemRepo.create({
          cartId: cart.id, productId: product.id,
          variantId: null, quantity: qty,
          unitPrice, bundleSelections: selections,
        }),
      );
      return this.getOrCreateCart(userId);
    }

    let unitPrice = Number(product.basePrice);
    if (dto.variantId) {
      const variant = product.variants?.find((v) => v.id === dto.variantId);
      if (!variant) throw new NotFoundException('Variant not found');
      if (variant.inventoryQuantity < qty) throw new BadRequestException('Insufficient stock');
      unitPrice = Number(variant.price);
    }

    const existingItem = cart.items?.find(
      (i) => i.productId === dto.productId && i.variantId === (dto.variantId ?? null),
    );
    if (existingItem) {
      existingItem.quantity += qty;
      await this.cartItemRepo.save(existingItem);
    } else {
      await this.cartItemRepo.save(
        this.cartItemRepo.create({
          cartId: cart.id, productId: dto.productId,
          variantId: dto.variantId ?? null, quantity: qty,
          unitPrice, bundleSelections: null,
        }),
      );
    }
    return this.getOrCreateCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items?.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Cart item not found');
    if (dto.quantity === 0) {
      await this.cartItemRepo.remove(item);
    } else {
      item.quantity = dto.quantity;
      await this.cartItemRepo.save(item);
    }
    return this.getOrCreateCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<Cart> {
    return this.updateItem(userId, itemId, { quantity: 0 });
  }

  async redeemPoints(
    userId: string,
    points: number,
    countryCode = 'HK',
  ): Promise<{ cart: Cart; pricing: CartPricingResult }> {
    const cart = await this.getOrCreateCart(userId);

    // Validate and get capped points
    const afterDiscount = await this.pointsService.validateRedemption(
      userId,
      points,
      cart.subtotal,
    );

    await this.cartRepo.update(cart.id, { redeemedPoints: afterDiscount });
    return this.getCartWithPricing(userId, countryCode);
  }

  async cancelPointsRedemption(
    userId: string,
  ): Promise<void> {
    const cart = await this.getOrCreateCart(userId);
    await this.cartRepo.update(cart.id, { redeemedPoints: null });
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.getOrCreateCart(userId);
    await this.cartItemRepo.delete({ cartId: cart.id });
    await this.cartRepo.update(cart.id, {
      couponCode: null,
      couponId: null,
      selectedShippingMethodId: null,
      redeemedPoints: null,
    });
  }

  // ── Coupon management ─────────────────────────────────────────────────────

  async applyCoupon(
    userId: string,
    code: string,
  ): Promise<{ cart: Cart; pricing: CartPricingResult }> {
    await this.promotionsService.findOneCoupon(code);
    const cart = await this.getOrCreateCart(userId);
    await this.cartRepo.update(cart.id, { couponCode: code.toUpperCase() });
    return this.getCartWithPricing(userId);
  }

  async removeCoupon(
    userId: string,
  ): Promise<{ cart: Cart; pricing: CartPricingResult }> {
    const cart = await this.getOrCreateCart(userId);
    await this.cartRepo.update(cart.id, { couponCode: null, couponId: null });
    return this.getCartWithPricing(userId);
  }
}
