import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum SearchSortBy {
  RELEVANCE  = 'relevance',   // ts_rank — only meaningful when q is set
  PRICE_ASC  = 'price_asc',
  PRICE_DESC = 'price_desc',
  NEWEST     = 'newest',
  RATING     = 'rating',
  POPULAR    = 'popular',     // by review_count
}

export class SearchQueryDto {
  @ApiPropertyOptional({ description: 'Full-text search query' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Include products from child categories' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeSubcategories?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ enum: ['simple', 'variable', 'bundle'] })
  @IsOptional()
  @IsString()
  productType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Only show products with stock > 0' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({ enum: SearchSortBy, default: SearchSortBy.RELEVANCE })
  @IsOptional()
  @IsEnum(SearchSortBy)
  sortBy?: SearchSortBy;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class SuggestQueryDto {
  @ApiPropertyOptional({ description: 'Prefix to autocomplete' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}
