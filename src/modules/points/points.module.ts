import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsConfig } from './entities/points-config.entity';
import { PointsRoleConfig } from './entities/points-role-config.entity';
import { UserPoints } from './entities/user-points.entity';
import { PointsTransaction } from './entities/points-transaction.entity';
import { UserTierMembership } from '../tiers/entities/user-tier-membership.entity';
import { PointsService } from './points.service';
import { PointsAdminController, PointsCustomerController } from './points.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PointsConfig, PointsRoleConfig,
      UserPoints, PointsTransaction,
      UserTierMembership,
    ]),
  ],
  providers:   [PointsService],
  controllers: [PointsAdminController, PointsCustomerController],
  exports:     [PointsService],
})
export class PointsModule {}
