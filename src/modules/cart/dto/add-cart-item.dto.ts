import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class BundleSelectionItemDto {
  @ApiProperty({ description: 'BundleGroupItem ID' })
  @IsUUID()
  groupItemId: string;

  @ApiPropertyOptional({
    description: 'Override quantity (defaults to item.quantity)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

class BundleSelectionDto {
  @ApiProperty({ description: 'BundleGroup ID' })
  @IsUUID()
  groupId: string;

  @ApiProperty({ type: [BundleSelectionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleSelectionItemDto)
  items: BundleSelectionItemDto[];
}

export class AddCartItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ description: 'Required for variable products' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    type: [BundleSelectionDto],
    description: 'Required for bundle products — one entry per group',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleSelectionDto)
  bundleSelections?: BundleSelectionDto[];
}
