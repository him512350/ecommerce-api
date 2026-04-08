import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TierConfig } from './entities/tier-config.entity';
import { UserTierMembership } from './entities/user-tier-membership.entity';
import { UserTierHistory } from './entities/user-tier-history.entity';
import { UserSegment } from '../users/entities/user-segment.entity';
import { Order } from '../orders/entities/order.entity';
import { TierConfigService } from './tier-config.service';
import { TierEvaluationService } from './tier-evaluation.service';
import { TiersController } from './tiers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TierConfig,
      UserTierMembership,
      UserTierHistory,
      UserSegment,
      Order,
    ]),
  ],
  providers: [TierConfigService, TierEvaluationService],
  controllers: [TiersController],
  exports: [TierEvaluationService, TierConfigService],
})
export class TiersModule {}
