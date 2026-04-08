import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CartService } from '../cart/cart.service';
import { PromotionEngineService } from '../promotions/promotion-engine.service';
import { PromotionsService } from '../promotions/promotions.service';
import { ShippingCalculatorService } from '../shipping/shipping-calculator.service';
import { PointsService } from '../points/points.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '../../common/utils/pagination.util';
import { OrderStatus, PaymentStatus } from '../../common/enums';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepo: Repository<OrderItem>,
    private readonly cartService: CartService,
    private readonly promotionEngine: PromotionEngineService,
    private readonly promotionsService: PromotionsService,
    private readonly shippingCalculator: ShippingCalculatorService,
    private readonly pointsService: PointsService,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    const cart = await this.cartService.getOrCreateCart(userId);

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cannot create order from empty cart');
    }

    // Use the coupon from the DTO if provided, otherwise use what is stored on the cart
    const couponCode = dto.couponCode ?? cart.couponCode ?? undefined;

    // Run the full promotion engine to get authoritative pricing
    const pricing = await this.promotionEngine.evaluate(cart, userId, couponCode);

    return this.dataSource.transaction(async (manager) => {
      // Build order items from the engine's itemPricings
      const orderItems: Partial<OrderItem>[] = pricing.itemPricings.map((ip) => {
        const cartItem = cart.items.find((i) => i.id === ip.cartItemId)!;
        return {
          productId:       ip.productId,
          variantId:       ip.variantId,
          quantity:        ip.quantity,
          unitPrice:       ip.unitPrice,
          totalPrice:      ip.finalTotal,
          productName:     ip.productName,
          productSnapshot: {
            sku:    cartItem.product?.sku,
            images: cartItem.product?.images?.map((i) => i.url),
          },
        };
      });

      // Add free gift items (zero-priced lines)
      for (const gift of pricing.giftItems) {
        orderItems.push({
          productId:   gift.productId,
          variantId:   gift.variantId,
          quantity:    gift.quantity,
          unitPrice:   0,
          totalPrice:  0,
          productName: `[Gift] ${gift.promotionName}`,
          productSnapshot: { isGift: true, promotionId: gift.promotionId },
        });
      }

      const orderNumber = `ORD-${Date.now()}`;

      // Compute real shipping cost from the method stored on the cart
      const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0);
      let realShippingCost = 0;
      if (cart.selectedShippingMethodId) {
        try {
          const raw = await this.shippingCalculator.computeCost(
            cart.selectedShippingMethodId,
            pricing.subtotal - pricing.itemDiscountTotal,
            itemCount,
          );
          const discount = Math.min(pricing.shippingDiscount, raw);
          realShippingCost = +(raw - discount).toFixed(2);
        } catch {
          realShippingCost = 0;
        }
      }
      // ── Points redemption ──────────────────────────────────────────────
      const redeemedPoints = cart.redeemedPoints ?? 0;
      let pointsDiscount = 0;
      if (redeemedPoints > 0) {
        pointsDiscount = await this.pointsService
          .computeDiscount(userId, redeemedPoints)
          .catch(() => 0);
      }

      const realTotal = +(
        pricing.subtotal -
        pricing.itemDiscountTotal -
        pointsDiscount +
        realShippingCost +
        pricing.taxAmount
      ).toFixed(2);

      const order = manager.create(Order, {
        userId,
        orderNumber,
        subtotal:        pricing.subtotal,
        taxAmount:       pricing.taxAmount,
        shippingCost:    realShippingCost,
        discountAmount:  pricing.itemDiscountTotal + pointsDiscount,
        total:           Math.max(0, realTotal),
        shippingAddressId: dto.shippingAddressId,
        notes:           dto.notes,
        status:          OrderStatus.PENDING,
      });

      const savedOrder = await manager.save(order);

      // Save order items
      const items = orderItems.map((item) =>
        manager.create(OrderItem, { ...item, orderId: savedOrder.id }),
      );
      await manager.save(items);

      // Record promotion usage logs
      for (const ap of pricing.appliedPromotions) {
        await this.promotionEngine.recordUsage(
          ap.promotionId, userId, savedOrder.id, ap.discountAmount,
        );
      }

      // Deduct redeemed points — outside the transaction so a points failure
      // doesn't roll back a successfully placed order
      if (redeemedPoints > 0 && pointsDiscount > 0) {
        this.pointsService
          .deductForOrder(userId, savedOrder.id, redeemedPoints, pointsDiscount)
          .catch((err) => console.error(`Points deduction failed for order ${savedOrder.id}: ${err.message}`));
      }

      // Clear cart (items + coupon)
      await this.cartService.clearCart(userId);

      // Fetch the full order for the confirmation email
      const fullOrder = await manager.findOne(Order, {
        where: { id: savedOrder.id },
        relations: ['items', 'shippingAddress'],
      });

      if (fullOrder) {
        const user = await this.usersService.findOne(userId);
        this.mailService.sendOrderConfirmation(fullOrder, user);
      }

      if (!fullOrder) throw new Error('Failed to retrieve created order');
      return fullOrder;
    });
  }

  async findAll(userId: string, pagination: PaginationDto) {
    const qb = this.ordersRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.userId = :userId', { userId })
      .orderBy('order.createdAt', 'DESC');

    return paginate(qb, pagination);
  }

  async findAllAdmin(pagination: PaginationDto) {
    const qb = this.ordersRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.createdAt', 'DESC');

    if (pagination.search) {
      qb.where('order.orderNumber ILIKE :s OR user.email ILIKE :s', {
        s: `%${pagination.search}%`,
      });
    }

    return paginate(qb, pagination);
  }

  async findOne(id: string, userId?: string): Promise<Order> {
    const where: any = { id };
    if (userId) where.userId = userId;

    const order = await this.ordersRepo.findOne({
      where,
      relations: ['items', 'items.product', 'shippingAddress', 'payment'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.findOne(id);
    order.status = dto.status;
    return this.ordersRepo.save(order);
  }

  async updatePaymentStatus(orderId: string, status: PaymentStatus): Promise<void> {
    await this.ordersRepo.update(orderId, { paymentStatus: status });
  }

  async updatePaymentIntentId(orderId: string, paymentIntentId: string): Promise<void> {
    await this.ordersRepo.update(orderId, { paymentIntentId });
  }
}
