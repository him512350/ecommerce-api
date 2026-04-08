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
import { CouponsService } from '../coupons/coupons.service';
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
    private readonly couponsService: CouponsService,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    const cart = await this.cartService.getOrCreateCart(userId);

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cannot create order from empty cart');
    }

    return this.dataSource.transaction(async (manager) => {
      let subtotal = 0;
      let discountAmount = 0;
      let couponId: string | undefined;

      // Calculate subtotal from cart items
      const orderItems: Partial<OrderItem>[] = cart.items.map((item) => {
        const totalPrice = Number(item.unitPrice) * item.quantity;
        subtotal += totalPrice;
        return {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice,
          productName: item.product.name,
          productSnapshot: {
            sku: item.product.sku,
            images: item.product.images?.map((i) => i.url),
          },
        };
      });

      // ── Coupon ────────────────────────────────────────────────────
      // Read the coupon that was already applied and saved on the cart.
      // We re-validate here to guard against edge cases (coupon deactivated
      // between cart page and checkout, usage limit just hit, etc.).
      if (cart.couponCode) {
        try {
          const coupon = await this.couponsService.validate(
            cart.couponCode,
            subtotal,
          );
          discountAmount = this.couponsService.calculateDiscount(
            coupon,
            subtotal,
          );
          couponId = coupon.id;
          await this.couponsService.incrementUsage(coupon.id);
        } catch {
          // Coupon became invalid between cart page and checkout (expired,
          // usage limit reached, etc.). Proceed without the discount rather
          // than blocking the order — the frontend should surface this.
          discountAmount = 0;
          couponId = undefined;
        }
      }
      // ─────────────────────────────────────────────────────────────

      const taxAmount = +(subtotal * 0.09).toFixed(2); // 9% GST example
      const shippingCost = subtotal >= 50 ? 0 : 5.99;
      const total = +(
        subtotal +
        taxAmount +
        shippingCost -
        discountAmount
      ).toFixed(2);

      const orderNumber = `ORD-${Date.now()}`;

      const order = manager.create(Order, {
        userId,
        orderNumber,
        subtotal,
        taxAmount,
        shippingCost,
        discountAmount,
        total,
        shippingAddressId: dto.shippingAddressId,
        couponId,
        notes: dto.notes,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await manager.save(order);

      // Save order items
      const items = orderItems.map((item) =>
        manager.create(OrderItem, { ...item, orderId: savedOrder.id }),
      );
      await manager.save(items);

      // Clear the cart (items + coupon)
      await this.cartService.clearCart(userId);

      // Fetch full order for email
      const fullOrder = await manager.findOne(Order, {
        where: { id: savedOrder.id },
        relations: ['items', 'shippingAddress', 'coupon'],
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
      relations: [
        'items',
        'items.product',
        'shippingAddress',
        'coupon',
        'payment',
      ],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.findOne(id);
    order.status = dto.status;
    return this.ordersRepo.save(order);
  }

  async updatePaymentStatus(
    orderId: string,
    status: PaymentStatus,
  ): Promise<void> {
    await this.ordersRepo.update(orderId, { paymentStatus: status });
  }

  async updatePaymentIntentId(
    orderId: string,
    paymentIntentId: string,
  ): Promise<void> {
    await this.ordersRepo.update(orderId, { paymentIntentId });
  }
}
