
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpgradeConditionGroup } from '../interfaces/tier-rules.interface';

class UpgradeConditionDto {
  @ApiProperty({
    enum: [
      'single_order_amount',
      'cumulative_amount_in_days',
      'order_count_in_days',
      'manual',
    ],
  })
  @IsString()
  type: string;

  @ApiPropertyOptional({ example: 3000 })
  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  minCount?: number;

  @ApiPropertyOptional({ example: 90, description: 'Look-back window in days' })
  @IsOptional()
  @IsInt()
  withinDays?: number;
}

class UpgradeConditionGroupDto {
  @ApiProperty({ enum: ['AND', 'OR'] })
  @IsEnum(['AND', 'OR'])
  operator: 'AND' | 'OR';

  @ApiProperty({ type: [UpgradeConditionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpgradeConditionDto)
  conditions: UpgradeConditionDto[];
}

export class CreateTierConfigDto {
  @ApiProperty({ example: 'vip' })
  @IsString()
  @MaxLength(40)
  tierName: string;

  @ApiProperty({ example: 'VIP' })
  @IsString()
  @MaxLength(80)
  displayName: string;

  @ApiProperty({
    example: 10,
    description: 'Higher = higher tier. Customer is 0.',
  })
  @IsInt()
  @Min(1)
  priority: number;

  @ApiProperty({ example: 365, description: 'Membership duration in days' })
  @IsInt()
  @Min(1)
  membershipDurationDays: number;

  @ApiProperty({
    type: [UpgradeConditionGroupDto],
    description:
      'Groups combine with OR. Conditions within a group combine with the group operator.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpgradeConditionGroupDto)
  upgradeConditionGroups: UpgradeConditionGroupDto[];

  @ApiProperty({
    type: [UpgradeConditionGroupDto],
    description: 'Renewal conditions evaluated near/at expiry',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpgradeConditionGroupDto)
  renewalConditionGroups: UpgradeConditionGroupDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  autoDowngrade?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
