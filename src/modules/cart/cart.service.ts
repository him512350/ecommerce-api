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
  ) {}

  // ── Cart retrieval ────────────────────────────────────────────────────────

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepo.findOne({
      where: { userId },
      relations: [
        'items',
        'items.product',
        'items.product.category',
        'items.variant',
      ],
    });
    if (!cart) {
      cart = await this.cartRepo.save(this.cartRepo.create({ userId }));
    }
    return cart;
  }

  /**
   * Returns the cart together with a full pricing breakdown
   * computed by the promotion engine (discounts, gifts, totals).
   */
  async getCartWithPricing(
    userId: string,
  ): Promise<{ cart: Cart; pricing: CartPricingResult }> {
    const cart = await this.getOrCreateCart(userId);
    const pricing = await this.promotionEngine.evaluate(
      cart,
      userId,
      cart.couponCode ?? undefined,
    );
    return { cart, pricing };
  }

  // ── Item management ───────────────────────────────────────────────────────

  async addItem(userId: string, dto: AddCartItemDto): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    const product = await this.productsService.findOne(dto.productId);
    const qty = dto.quantity ?? 1;

    if (!product.isActive)
      throw new BadRequestException('Product is not available');

    // ── Bundle product ────────────────────────────────────────────────────
    if (product.productType === 'bundle') {
      if (!dto.bundleSelections?.length) {
        // Auto-resolve default selections for fixed bundles
        const defaults = await this.bundleService.getDefaultSelections(
          product.id,
        );
        dto.bundleSelections = defaults as any;
      }

      const { unitPrice, selections } =
        await this.bundleService.validateAndPrice(
          product,
          dto.bundleSelections as any,
        );

      // Bundles are always added as a new line (no merging — selections may differ)
      await this.cartItemRepo.save(
        this.cartItemRepo.create({
          cartId: cart.id,
          productId: product.id,
          variantId: null,
          quantity: qty,
          unitPrice,
          bundleSelections: selections,
        }),
      );

      return this.getOrCreateCart(userId);
    }

    // ── Simple / variable product ─────────────────────────────────────────
    let unitPrice = Number(product.basePrice);

    if (dto.variantId) {
      const variant = product.variants?.find((v) => v.id === dto.variantId);
      if (!variant) throw new NotFoundException('Variant not found');
      if (variant.inventoryQuantity < qty) {
        throw new BadRequestException('Insufficient stock');
      }
      unitPrice = Number(variant.price);
    }

    const existingItem = cart.items?.find(
      (i) =>
        i.productId === dto.productId &&
        i.variantId === (dto.variantId ?? null),
    );

    if (existingItem) {
      existingItem.quantity += qty;
      await this.cartItemRepo.save(existingItem);
    } else {
      await this.cartItemRepo.save(
        this.cartItemRepo.create({
          cartId: cart.id,
          productId: dto.productId,
          variantId: dto.variantId ?? null,
          quantity: qty,
          unitPrice,
          bundleSelections: null,
        }),
      );
    }

    return this.getOrCreateCart(userId);
  }

  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<Cart> {
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

  async clearCart(userId: string): Promise<void> {
    const cart = await this.getOrCreateCart(userId);
    await this.cartItemRepo.delete({ cartId: cart.id });
    // Also clear any applied coupon
    await this.cartRepo.update(cart.id, { couponCode: null, couponId: null });
  }

  // ── Coupon management ─────────────────────────────────────────────────────

  /**
   * Validates the coupon exists and is active, then stores it on the cart.
   * Full condition / usage-limit checks happen during pricing evaluation.
   */
  async applyCoupon(
    userId: string,
    code: string,
  ): Promise<{ cart: Cart; pricing: CartPricingResult }> {
    // Validate coupon exists and is globally active
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
