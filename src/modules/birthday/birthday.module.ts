import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BirthdayCouponConfig } from './entities/birthday-coupon-config.entity';
import { BirthdayCouponLog } from './entities/birthday-coupon-log.entity';
import { User } from '../users/entities/user.entity';
import { BirthdayCouponService } from './birthday-coupon.service';
import { BirthdayController } from './birthday.controller';
import { PromotionsModule } from '../promotions/promotions.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BirthdayCouponConfig, BirthdayCouponLog, User]),
    PromotionsModule,
    MailModule,
  ],
  providers: [BirthdayCouponService],
  controllers: [BirthdayController],
  exports: [BirthdayCouponService],
})
export class BirthdayModule {}
