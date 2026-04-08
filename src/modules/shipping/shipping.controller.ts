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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ShippingAdminService } from './shipping-admin.service';
import { ShippingCalculatorService } from './shipping-calculator.service';
import {
  CreateShippingMethodDto,
  CreateShippingRateDto,
  CreateShippingZoneDto,
} from './dto/shipping.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('Shipping')
@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly adminService: ShippingAdminService,
    private readonly calculator: ShippingCalculatorService,
  ) {}

  // ── Public: get options for a country + cart ──────────────────────────────

  @Get('options')
  @ApiOperation({ summary: 'Get available shipping methods for a country and cart total' })
  @ApiQuery({ name: 'country', required: true, example: 'HK' })
  @ApiQuery({ name: 'subtotal', required: true, example: '250' })
  @ApiQuery({ name: 'items', required: false, example: '3' })
  getOptions(
    @Query('country') country: string,
    @Query('subtotal') subtotal: string,
    @Query('items') items = '1',
  ) {
    return this.calculator.getOptions(
      country.toUpperCase(),
      parseFloat(subtotal),
      parseInt(items, 10),
    );
  }

  // ── Admin: zones ──────────────────────────────────────────────────────────

  @Post('zones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create shipping zone (admin)' })
  createZone(@Body() dto: CreateShippingZoneDto) {
    return this.adminService.createZone(dto);
  }

  @Get('zones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all shipping zones with methods and rates (admin)' })
  listZones() {
    return this.adminService.findAllZones();
  }

  @Get('zones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  getZone(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findZone(id);
  }

  @Patch('zones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a shipping zone (admin)' })
  updateZone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateShippingZoneDto>,
  ) {
    return this.adminService.updateZone(id, dto);
  }

  @Delete('zones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a shipping zone and all its methods (admin)' })
  deleteZone(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteZone(id);
  }

  // ── Admin: methods ────────────────────────────────────────────────────────

  @Post('zones/:zoneId/methods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add a shipping method to a zone (admin)' })
  createMethod(
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
    @Body() dto: CreateShippingMethodDto,
  ) {
    return this.adminService.createMethod(zoneId, dto);
  }

  @Patch('methods/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a shipping method (admin)' })
  updateMethod(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateShippingMethodDto>,
  ) {
    return this.adminService.updateMethod(id, dto);
  }

  @Delete('methods/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a shipping method (admin)' })
  deleteMethod(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteMethod(id);
  }

  // ── Admin: rates ──────────────────────────────────────────────────────────

  @Post('methods/:methodId/rates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add a rate rule to a shipping method (admin)' })
  createRate(
    @Param('methodId', ParseUUIDPipe) methodId: string,
    @Body() dto: CreateShippingRateDto,
  ) {
    return this.adminService.createRate(methodId, dto);
  }

  @Patch('rates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a rate rule (admin)' })
  updateRate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateShippingRateDto>,
  ) {
    return this.adminService.updateRate(id, dto);
  }

  @Delete('rates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a rate rule (admin)' })
  deleteRate(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteRate(id);
  }
}
