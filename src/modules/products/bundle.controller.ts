import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BundleService } from './bundle.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('Bundle Products')
@ApiBearerAuth('access-token')
@Controller('products')
export class BundleController {
  constructor(private readonly bundleService: BundleService) {}

  // ── Public ────────────────────────────────────────────────────────────────

  @Get(':productId/bundle')
  @ApiOperation({ summary: 'Get full bundle config for a product (public)' })
  getConfig(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.bundleService.getConfig(productId);
  }

  // ── Admin: bundle config ──────────────────────────────────────────────────

  @Post(':productId/bundle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create bundle config for a product (admin)' })
  createConfig(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: any,
  ) {
    return this.bundleService.createConfig(productId, dto);
  }

  @Patch(':productId/bundle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update bundle config (admin)' })
  updateConfig(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: any,
  ) {
    return this.bundleService.updateConfig(productId, dto);
  }

  @Delete(':productId/bundle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Delete bundle config and revert product to simple (admin)',
  })
  deleteConfig(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.bundleService.deleteConfig(productId);
  }

  // ── Admin: groups ─────────────────────────────────────────────────────────

  @Post(':productId/bundle/groups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a group to a bundle (admin)' })
  addGroup(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: any,
  ) {
    return this.bundleService.addGroup(productId, dto);
  }

  @Patch('bundle/groups/:groupId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a bundle group (admin)' })
  updateGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: any,
  ) {
    return this.bundleService.updateGroup(groupId, dto);
  }

  @Delete('bundle/groups/:groupId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a bundle group (admin)' })
  deleteGroup(@Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.bundleService.deleteGroup(groupId);
  }

  // ── Admin: group items ────────────────────────────────────────────────────

  @Post('bundle/groups/:groupId/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add an item to a bundle group (admin)' })
  addGroupItem(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: any,
  ) {
    return this.bundleService.addGroupItem(groupId, dto);
  }

  @Patch('bundle/groups/items/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a bundle group item (admin)' })
  updateGroupItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: any,
  ) {
    return this.bundleService.updateGroupItem(itemId, dto);
  }

  @Delete('bundle/groups/items/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a bundle group item (admin)' })
  deleteGroupItem(@Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.bundleService.deleteGroupItem(itemId);
  }
}
