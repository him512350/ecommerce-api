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

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    private readonly productsService: ProductsService,
  ) {}

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepo.findOne({
      where: { userId },
      relations: ['items', 'items.product', 'items.variant'],
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

  async clearCart(userId: string): Promise<void> {
    const cart = await this.getOrCreateCart(userId);
    await this.cartItemRepo.delete({ cartId: cart.id });
  }
}
