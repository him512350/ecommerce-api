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
import { OrderStatus } from '../../common/enums';

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

      // Calculate subtotal
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

      // Apply coupon
      if (dto.couponCode) {
        const coupon = await this.couponsService.validate(
          dto.couponCode,
          subtotal,
        );
        discountAmount = this.couponsService.calculateDiscount(
          coupon,
          subtotal,
        );
        couponId = coupon.id;
        await this.couponsService.incrementUsage(coupon.id);
      }

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

      // Clear cart
      await this.cartService.clearCart(userId);

      const savedOrderFull = await manager.findOne(Order, {
        where: { id: savedOrder.id },
        relations: ['items', 'shippingAddress', 'coupon'],
      });
      if (!savedOrderFull) throw new Error('Failed to retrieve order after creation');
      return savedOrderFull;
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
    if (userId) where.userId = userId; // customers can only see their own orders

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
}
