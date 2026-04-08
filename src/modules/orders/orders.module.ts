import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CartModule } from '../cart/cart.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { ShippingModule } from '../shipping/shipping.module';
import { PointsModule } from '../points/points.module';
import { EmailModule } from '../email/email.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    CartModule,
    PromotionsModule,
    ShippingModule,
    PointsModule,
    EmailModule,
    MailModule,
    UsersModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
