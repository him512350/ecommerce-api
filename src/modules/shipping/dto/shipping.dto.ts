import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShippingRateCondition, ShippingRateType } from '../../../common/enums';

// ── Zone ──────────────────────────────────────────────────────────────────────

export class CreateShippingZoneDto {
  @ApiProperty({ example: 'Hong Kong' })
  @IsString() @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({
    example: ['HK'],
    description: 'ISO 3166-1 alpha-2 codes. Use ["*"] for catch-all.',
  })
  @IsArray() @IsString({ each: true })
  countries: string[];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

// ── Method ────────────────────────────────────────────────────────────────────

export class CreateShippingMethodDto {
  @ApiProperty({ example: 'Standard Delivery' })
  @IsString() @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Delivered in 3-5 working days' })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '3-5 working days' })
  @IsOptional() @IsString() @MaxLength(80)
  estimatedDays?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

// ── Rate ──────────────────────────────────────────────────────────────────────

export class CreateShippingRateDto {
  @ApiProperty({ enum: ShippingRateCondition })
  @IsEnum(ShippingRateCondition)
  conditionType: ShippingRateCondition;

  @ApiPropertyOptional({ description: 'Lower bound (order_min, order_between, item_count_min)' })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  conditionMin?: number;

  @ApiPropertyOptional({ description: 'Upper bound (order_max, order_between)' })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  conditionMax?: number;

  @ApiProperty({ enum: ShippingRateType })
  @IsEnum(ShippingRateType)
  rateType: ShippingRateType;

  @ApiPropertyOptional({ default: 0, description: 'Ignored when rateType = free' })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  cost?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @IsInt()
  sortOrder?: number;
}

// ── Select shipping on cart ───────────────────────────────────────────────────

export class SelectShippingMethodDto {
  @ApiProperty({ description: 'ShippingMethod ID to apply to this cart' })
  @IsString()
  methodId: string;
}
