import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BirthdayCouponService } from './birthday-coupon.service';
import { UpdateBirthdayCouponConfigDto } from './dto/birthday-coupon-config.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Birthday Coupon')
@ApiBearerAuth('access-token')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('birthday-coupon')
export class BirthdayController {
  constructor(private readonly birthdayService: BirthdayCouponService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get current birthday coupon configuration (admin)' })
  getConfig() {
    return this.birthdayService.getConfig();
  }

  @Patch('config')
  @ApiOperation({ summary: 'Update birthday coupon configuration (admin)' })
  saveConfig(@Body() dto: UpdateBirthdayCouponConfigDto) {
    return this.birthdayService.saveConfig(dto);
  }

  @Get('logs')
  @ApiOperation({ summary: 'List all birthday coupons sent (admin)' })
  getLogs(@Query() pagination: PaginationDto) {
    return this.birthdayService.getLogs(pagination);
  }

  @Post('trigger/:userId')
  @ApiOperation({
    summary: 'Manually send birthday coupon to a specific user (admin — for testing)',
  })
  triggerForUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.birthdayService.triggerForUser(userId);
  }
}
