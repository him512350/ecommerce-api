import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateBirthdayCouponConfigDto {
  @ApiPropertyOptional({ description: 'Enable or disable the birthday coupon feature' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ default: 0, description: 'Days before birthday to send (0 = on the day)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  daysBefore?: number;

  @ApiPropertyOptional({ enum: ['percentage', 'fixed_amount'], default: 'percentage' })
  @IsOptional()
  @IsEnum(['percentage', 'fixed_amount'])
  couponType?: string;

  @ApiPropertyOptional({ description: 'Discount value — percent or fixed HKD amount' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  couponValue?: number;

  @ApiPropertyOptional({ default: 30, description: 'Days the coupon is valid after being sent' })
  @IsOptional()
  @IsInt()
  @Min(1)
  validityDays?: number;

  @ApiPropertyOptional({ default: 0, description: 'Minimum cart subtotal to use the coupon (0 = no minimum)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Email subject — use {{first_name}} as placeholder' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  emailSubject?: string;

  @ApiPropertyOptional({
    description: 'Custom email body — use {{first_name}}, {{coupon_code}}, {{valid_until}}, {{discount}} as placeholders',
  })
  @IsOptional()
  @IsString()
  emailMessage?: string;
}
