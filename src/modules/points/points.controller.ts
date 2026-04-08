import {
  Body, Controller, Delete, Get, Param,
  ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PointsService } from './points.service';
import {
  AdjustPointsDto, RedeemPointsDto,
  UpdatePointsConfigDto, UpsertRoleConfigDto,
} from './dto/points.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

// ── Admin ──────────────────────────────────────────────────────────────────

@ApiTags('Points — Admin')
@ApiBearerAuth('access-token')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('points')
export class PointsAdminController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get global points config' })
  getConfig() { return this.pointsService.getConfig(); }

  @Patch('config')
  @ApiOperation({ summary: 'Update global points config (enable/disable, expiry, limits)' })
  updateConfig(@Body() dto: UpdatePointsConfigDto) {
    return this.pointsService.updateConfig(dto);
  }

  @Get('role-configs')
  @ApiOperation({ summary: 'List all per-tier earn and redemption rates' })
  getRoleConfigs() { return this.pointsService.getAllRoleConfigs(); }

  @Post('role-configs')
  @ApiOperation({ summary: 'Create or update earn/redemption rate for a tier' })
  upsertRoleConfig(@Body() dto: UpsertRoleConfigDto) {
    return this.pointsService.upsertRoleConfig(dto);
  }

  @Delete('role-configs/:tierName')
  @ApiOperation({ summary: 'Remove a custom rate for a tier (falls back to customer defaults)' })
  deleteRoleConfig(@Param('tierName') tierName: string) {
    return this.pointsService.deleteRoleConfig(tierName);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Points in circulation, total earned/redeemed/expired' })
  getStats() { return this.pointsService.getStats(); }

  @Get('transactions')
  @ApiOperation({ summary: 'All points transactions across all users' })
  @ApiQuery({ name: 'page',  required: false })
  @ApiQuery({ name: 'limit', required: false })
  getAllTransactions(
    @Query('page',  new ParseIntPipe({ optional: true })) page  = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) { return this.pointsService.getAllTransactions(page, limit); }

  @Get('users/:userId')
  @ApiOperation({ summary: "Get a user's points wallet (balance + lifetime stats)" })
  getUserWallet(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.pointsService.getWallet(userId);
  }

  @Get('users/:userId/transactions')
  @ApiOperation({ summary: "Get a user's full points history" })
  @ApiQuery({ name: 'page',  required: false })
  @ApiQuery({ name: 'limit', required: false })
  getUserTransactions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page',  new ParseIntPipe({ optional: true })) page  = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) { return this.pointsService.getTransactions(userId, page, limit); }

  @Post('users/:userId/adjust')
  @ApiOperation({ summary: 'Manually add or deduct points for a user' })
  adjustPoints(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AdjustPointsDto,
  ) { return this.pointsService.adjustPoints(userId, dto); }
}

// ── Customer ────────────────────────────────────────────────────────────────

@ApiTags('Points — Customer')
@ApiBearerAuth('access-token')
@UseGuards(FirebaseAuthGuard)
@Controller('points/me')
export class PointsCustomerController {
  constructor(private readonly pointsService: PointsService) {}

  @Get()
  @ApiOperation({ summary: 'My points balance, earn rate, and redemption rate' })
  getMyWallet(@CurrentUser('id') userId: string) {
    return this.pointsService.getWallet(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'My points transaction history' })
  @ApiQuery({ name: 'page',  required: false })
  @ApiQuery({ name: 'limit', required: false })
  getMyTransactions(
    @CurrentUser('id') userId: string,
    @Query('page',  new ParseIntPipe({ optional: true })) page  = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) { return this.pointsService.getTransactions(userId, page, limit); }
}
