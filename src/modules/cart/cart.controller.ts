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
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApplyCouponDto } from '../promotions/dto/apply-coupon.dto';
import { SelectShippingMethodDto } from '../shipping/dto/shipping.dto';
import { RedeemPointsDto } from '../points/dto/points.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Cart')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get cart with pricing, discounts, and available shipping options' })
  @ApiQuery({ name: 'country', required: false, example: 'HK', description: 'ISO country code for shipping options' })
  getCart(
    @CurrentUser('id') userId: string,
    @Query('country') country = 'HK',
  ) {
    return this.cartService.getCartWithPricing(userId, country.toUpperCase());
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  addItem(@CurrentUser('id') userId: string, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(userId, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity (0 = remove)' })
  updateItem(
    @CurrentUser('id') userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(userId, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove a single item from cart' })
  removeItem(
    @CurrentUser('id') userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.cartService.removeItem(userId, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire cart, coupon, and shipping selection' })
  clearCart(@CurrentUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }

  // ── Coupon endpoints ──────────────────────────────────────────────────────

  @Post('coupon')
  @ApiOperation({ summary: 'Apply a coupon code — returns updated pricing' })
  applyCoupon(@CurrentUser('id') userId: string, @Body() dto: ApplyCouponDto) {
    return this.cartService.applyCoupon(userId, dto.code);
  }

  @Delete('coupon')
  @ApiOperation({ summary: 'Remove the applied coupon — returns updated pricing' })
  removeCoupon(@CurrentUser('id') userId: string) {
    return this.cartService.removeCoupon(userId);
  }

  // ── Shipping method endpoints ─────────────────────────────────────────────

  @Post('shipping')
  @ApiOperation({ summary: 'Select a shipping method for this cart' })
  @ApiQuery({ name: 'country', required: false, example: 'HK' })
  setShipping(
    @CurrentUser('id') userId: string,
    @Body() dto: SelectShippingMethodDto,
    @Query('country') country = 'HK',
  ) {
    return this.cartService.setShippingMethod(userId, dto.methodId, country.toUpperCase());
  }

  @Delete('shipping')
  @ApiOperation({ summary: 'Clear the selected shipping method' })
  clearShipping(@CurrentUser('id') userId: string) {
    return this.cartService.clearShippingMethod(userId);
  }

  // ── Points redemption endpoints ───────────────────────────────────────────

  @Post('points')
  @ApiOperation({ summary: 'Apply points to cart for a discount' })
  @ApiQuery({ name: 'country', required: false, example: 'HK' })
  redeemPoints(
    @CurrentUser('id') userId: string,
    @Body() dto: RedeemPointsDto,
    @Query('country') country = 'HK',
  ) {
    return this.cartService.redeemPoints(userId, dto.points, country.toUpperCase());
  }

  @Delete('points')
  @ApiOperation({ summary: 'Remove points redemption from cart' })
  cancelPoints(@CurrentUser('id') userId: string) {
    return this.cartService.cancelPointsRedemption(userId);
  }
}
