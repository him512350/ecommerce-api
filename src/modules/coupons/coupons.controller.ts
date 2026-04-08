import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create coupon (admin)' })
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Get()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  findAll() {
    return this.couponsService.findAll();
  }

  @Post('validate')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Validate a coupon code before checkout' })
  async validate(@Body() dto: ValidateCouponDto) {
    const coupon = await this.couponsService.validate(dto.code, dto.subtotal);
    const discount = this.couponsService.calculateDiscount(
      coupon,
      dto.subtotal,
    );
    return { coupon, discount };
  }

  @Delete(':id/deactivate')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponsService.deactivate(id);
  }
}
