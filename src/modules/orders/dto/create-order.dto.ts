import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ description: 'Shipping address ID from user addresses' })
  @IsUUID()
  shippingAddressId: string;

  @ApiPropertyOptional({
    description: 'Coupon code — overrides any code stored on the cart',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
