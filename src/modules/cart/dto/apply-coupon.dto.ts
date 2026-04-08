import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ApplyCouponDto {
  @ApiProperty({ example: 'SAVE20', description: 'Coupon code to apply' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;
}
