import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ description: 'Shipping address ID from user addresses' })
  @IsUUID()
  shippingAddressId: string;

  // couponCode has been intentionally removed from this DTO.
  // Coupons are now applied on the cart page (POST /cart/coupon) and
  // stored server-side on the cart. OrdersService reads cart.couponCode
  // directly, so there is no need to send it again at checkout.

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
