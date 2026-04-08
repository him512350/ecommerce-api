import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from './entities/promotion.entity';
import { PromotionConditionGroup } from './entities/promotion-condition-group.entity';
import { PromotionCondition } from './entities/promotion-condition.entity';
import { PromotionAction } from './entities/promotion-action.entity';
import { PromotionUsageLog } from './entities/promotion-usage-log.entity';
import { UserSegment } from '../users/entities/user-segment.entity';
import { Order } from '../orders/entities/order.entity';
import { PromotionsService } from './promotions.service';
import { PromotionEngineService } from './promotion-engine.service';
import { PromotionsController } from './promotions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Promotion,
      PromotionConditionGroup,
      PromotionCondition,
      PromotionAction,
      PromotionUsageLog,
      UserSegment,
      Order,
    ]),
  ],
  providers: [PromotionsService, PromotionEngineService],
  controllers: [PromotionsController],
  exports: [PromotionsService, PromotionEngineService],
})
export class PromotionsModule {}
