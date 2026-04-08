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
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    private readonly productsService: ProductsService,
    private readonly couponsService: CouponsService,
  ) {}

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepo.findOne({
      where: { userId },
      relations: ['items', 'items.product', 'items.variant', 'coupon'],
    });
    if (!cart) {
      cart = this.cartRepo.create({ userId });
      cart = await this.cartRepo.save(cart);
    }
    return cart;
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    // Validate product & stock
    const product = await this.productsService.findOne(dto.productId);
    if (!product.isActive)
      throw new BadRequestException('Product is not available');

    let unitPrice = Number(product.basePrice);
    if (dto.variantId) {
      const variant = product.variants?.find((v) => v.id === dto.variantId);
      if (!variant) throw new NotFoundException('Variant not found');
      if (variant.inventoryQuantity < dto.quantity) {
        throw new BadRequestException('Insufficient stock');
      }
      unitPrice = Number(variant.price);
    }

    // Update quantity if item already exists
    const existingItem = cart.items?.find(
      (i) => i.productId === dto.productId && i.variantId === dto.variantId,
    );

    if (existingItem) {
      existingItem.quantity += dto.quantity;
      await this.cartItemRepo.save(existingItem);
    } else {
      const item = this.cartItemRepo.create({
        cartId: cart.id,
        productId: dto.productId,
        variantId: dto.variantId,
        quantity: dto.quantity,
        unitPrice,
      });
      await this.cartItemRepo.save(item);
    }

    // Re-fetch updated cart then recalculate discount if a coupon is applied
    const updatedCart = await this.getOrCreateCart(userId);
    if (updatedCart.couponCode) {
      return this._recalculateDiscount(updatedCart);
    }
    return updatedCart;
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

    // Re-fetch then recalculate discount in case subtotal changed
    const updatedCart = await this.getOrCreateCart(userId);
    if (updatedCart.couponCode) {
      return this._recalculateDiscount(updatedCart);
    }
    return updatedCart;
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.getOrCreateCart(userId);
    await this.cartItemRepo.delete({ cartId: cart.id });

    // Also clear any applied coupon when the cart is emptied
    cart.couponCode = null;
    cart.couponId = null;
    cart.coupon = null;
    cart.discountAmount = 0;
    await this.cartRepo.save(cart);
  }

  /**
   * Validate and attach a coupon to the cart.
   * The discount is calculated immediately and stored so GET /cart always
   * returns the correct discounted total without extra work from the frontend.
   */
  async applyCoupon(userId: string, code: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cannot apply coupon to an empty cart');
    }

    // validate throws descriptive errors if code is invalid, expired, etc.
    const coupon = await this.couponsService.validate(code, cart.subtotal);
    const discountAmount = this.couponsService.calculateDiscount(
      coupon,
      cart.subtotal,
    );

    cart.couponId = coupon.id;
    cart.coupon = coupon;
    cart.couponCode = coupon.code;
    cart.discountAmount = discountAmount;

    await this.cartRepo.save(cart);
    return cart;
  }

  /**
   * Remove the currently applied coupon from the cart.
   */
  async removeCoupon(userId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    cart.couponCode = null;
    cart.couponId = null;
    cart.coupon = null;
    cart.discountAmount = 0;

    await this.cartRepo.save(cart);
    return cart;
  }

  /**
   * Internal helper: re-validates the stored coupon against the current
   * subtotal and saves the updated discount amount.
   * Called after items change so the discount stays accurate.
   */
  private async _recalculateDiscount(cart: Cart): Promise<Cart> {
    try {
      const coupon = await this.couponsService.validate(
        cart.couponCode!,
        cart.subtotal,
      );
      cart.discountAmount = this.couponsService.calculateDiscount(
        coupon,
        cart.subtotal,
      );
    } catch {
      // Coupon no longer valid (e.g. subtotal dropped below minimum) — remove it
      cart.couponCode = null;
      cart.couponId = null;
      cart.coupon = null;
      cart.discountAmount = 0;
    }

    await this.cartRepo.save(cart);
    return cart;
  }
}
