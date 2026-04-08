import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { OrdersModule } from '../orders/orders.module';
import { TiersModule } from '../tiers/tiers.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), OrdersModule, TiersModule, PointsModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
