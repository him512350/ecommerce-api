import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsEnum, IsInt, IsNumber,
  IsOptional, IsString, MaxLength, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Global config ──────────────────────────────────────────────────────────

export class UpdatePointsConfigDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Days until earned points expire (0 = never)' })
  @IsOptional() @IsInt() @Min(0)
  expiryDays?: number;

  @ApiPropertyOptional({ description: 'Minimum points in wallet before any redemption is allowed' })
  @IsOptional() @IsInt() @Min(0)
  minPointsToRedeem?: number;

  @ApiPropertyOptional({ description: 'Max % of cart subtotal that can be covered by points (0–100)' })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  maxRedemptionPercent?: number;
}

// ── Role config ────────────────────────────────────────────────────────────

export class UpsertRoleConfigDto {
  @ApiProperty({ example: 'vip' })
  @IsString() @MaxLength(40)
  tierName: string;

  @ApiPropertyOptional({
    example: 1.5,
    description: 'Points earned per HKD spent (e.g. 1.5 = 1.5 pts per HKD)',
  })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 4 }) @Min(0)
  earnRate?: number;

  @ApiPropertyOptional({
    example: 80,
    description: 'Points required per HKD discount (e.g. 80 = 80 pts = HK$1)',
  })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 4 }) @Min(1)
  redemptionRate?: number;
}

// ── Manual admin adjustment ────────────────────────────────────────────────

export class AdjustPointsDto {
  @ApiProperty({ description: 'Positive = add, negative = deduct', example: 200 })
  @IsNumber() @IsInt()
  points: number;

  @ApiPropertyOptional({ description: 'Reason shown in the transaction log' })
  @IsOptional() @IsString() @MaxLength(255)
  description?: string;
}

// ── Customer: redeem points on cart ───────────────────────────────────────

export class RedeemPointsDto {
  @ApiProperty({ description: 'Number of points to apply to this cart', example: 500 })
  @IsInt() @Min(1)
  @Type(() => Number)
  points: number;
}
