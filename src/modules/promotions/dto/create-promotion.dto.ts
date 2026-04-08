import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUppercase,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ActionTarget,
  ActionType,
  ComparisonOperator,
  ConditionType,
  GroupOperator,
  PromotionType,
  StackableMode,
} from '../../../common/enums';

export class CreateConditionDto {
  @ApiProperty({ enum: ConditionType })
  @IsEnum(ConditionType)
  type: ConditionType;

  @ApiProperty({ enum: ComparisonOperator })
  @IsEnum(ComparisonOperator)
  operator: ComparisonOperator;

  @ApiProperty({ description: 'Number, boolean, string[], or object (JSONB)' })
  value: any;
}

export class CreateConditionGroupDto {
  @ApiPropertyOptional({ enum: GroupOperator, default: GroupOperator.AND })
  @IsOptional()
  @IsEnum(GroupOperator)
  operator?: GroupOperator;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiProperty({ type: [CreateConditionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConditionDto)
  conditions: CreateConditionDto[];
}

export class CreateActionDto {
  @ApiProperty({ enum: ActionType })
  @IsEnum(ActionType)
  type: ActionType;

  @ApiPropertyOptional({
    description: 'Percentage (0-100) or fixed HKD amount',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value?: number;

  @ApiPropertyOptional({ enum: ActionTarget, default: ActionTarget.ORDER })
  @IsOptional()
  @IsEnum(ActionTarget)
  target?: ActionTarget;

  @ApiPropertyOptional({
    description: 'JSONB config for bogo, tiered, free_gift, etc.',
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreatePromotionDto {
  @ApiProperty({ example: 'Summer Sale 20%' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PromotionType })
  @IsEnum(PromotionType)
  type: PromotionType;

  @ApiPropertyOptional({
    example: 'SUMMER20',
    description: 'Required when type = coupon',
  })
  @IsOptional()
  @IsString()
  @IsUppercase()
  @MaxLength(60)
  code?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ enum: StackableMode, default: StackableMode.NONE })
  @IsOptional()
  @IsEnum(StackableMode)
  stackable?: StackableMode;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Null = unlimited' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsesPerCustomer?: number;

  @ApiPropertyOptional({ type: [CreateConditionGroupDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConditionGroupDto)
  conditionGroups?: CreateConditionGroupDto[];

  @ApiProperty({ type: [CreateActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateActionDto)
  actions: CreateActionDto[];
}
