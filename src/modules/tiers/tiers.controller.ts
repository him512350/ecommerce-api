import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { TierConfigService } from './tier-config.service';
import { TierEvaluationService } from './tier-evaluation.service';
import { CreateTierConfigDto } from './dto/create-tier-config.dto';
import { UpdateTierConfigDto } from './dto/update-tier-config.dto';
import { ManualTierOverrideDto } from './dto/manual-override.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('Tiers')
@ApiBearerAuth('access-token')
@UseGuards(FirebaseAuthGuard)
@Controller('tiers')
export class TiersController {
  constructor(
    private readonly tierConfigService: TierConfigService,
    private readonly tierEvaluationService: TierEvaluationService,
  ) {}

  // ── Tier config (admin only) ──────────────────────────────────────────────

  @Post('configs')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a tier configuration (admin)' })
  createConfig(@Body() dto: CreateTierConfigDto) {
    return this.tierConfigService.create(dto);
  }

  @Get('configs')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all tier configurations (admin)' })
  listConfigs() {
    return this.tierConfigService.findAll();
  }

  @Get('configs/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a tier configuration by ID (admin)' })
  getConfig(@Param('id', ParseUUIDPipe) id: string) {
    return this.tierConfigService.findOne(id);
  }

  @Patch('configs/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a tier configuration (admin)' })
  updateConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTierConfigDto,
  ) {
    return this.tierConfigService.update(id, dto);
  }

  @Delete('configs/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a tier configuration (admin)' })
  deleteConfig(@Param('id', ParseUUIDPipe) id: string) {
    return this.tierConfigService.remove(id);
  }

  // ── Dashboard stats (admin only) ─────────────────────────────────────────

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Member count per tier (admin)' })
  getStats() {
    return this.tierConfigService.getMembershipStats();
  }

  @Get('members/:tierName')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List users in a specific tier (admin)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getMembersInTier(
    @Param('tierName') tierName: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.tierConfigService.getUsersInTier(tierName, +page, +limit);
  }

  // ── Manual override (admin only) ─────────────────────────────────────────

  @Patch('users/:userId/override')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Manually set a user tier, bypassing all conditions (admin)',
  })
  manualOverride(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ManualTierOverrideDto,
  ) {
    return this.tierEvaluationService.manualOverride(
      userId,
      dto.tierName,
      adminId,
      dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      dto.reason,
    );
  }

  // ── User history (admin only) ─────────────────────────────────────────────

  @Get('users/:userId/history')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get full tier change history for a user (admin)' })
  getUserHistory(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.tierConfigService.getUserHistory(userId);
  }

  @Get('users/:userId/membership')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get current tier membership for a user (admin)' })
  getUserMembership(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.tierConfigService.getUserMembership(userId);
  }

  // ── Customer self-service ─────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Get my current tier and membership details' })
  getMyTier(@CurrentUser('id') userId: string) {
    return this.tierConfigService.getUserMembership(userId);
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get my tier change history' })
  getMyHistory(@CurrentUser('id') userId: string) {
    return this.tierConfigService.getUserHistory(userId);
  }
}
