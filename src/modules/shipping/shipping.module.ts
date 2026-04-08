import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShippingZone } from './entities/shipping-zone.entity';
import { ShippingMethod } from './entities/shipping-method.entity';
import { ShippingRate } from './entities/shipping-rate.entity';
import { ShippingAdminService } from './shipping-admin.service';
import { ShippingCalculatorService } from './shipping-calculator.service';
import { ShippingController } from './shipping.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ShippingZone, ShippingMethod, ShippingRate])],
  providers: [ShippingAdminService, ShippingCalculatorService],
  controllers: [ShippingController],
  exports: [ShippingCalculatorService],
})
export class ShippingModule {}
