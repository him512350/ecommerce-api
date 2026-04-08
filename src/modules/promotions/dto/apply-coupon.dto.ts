import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUppercase, MaxLength } from 'class-validator';

export class ApplyCouponDto {
  @ApiProperty({ example: 'SUMMER20' })
  @IsString()
  @IsUppercase()
  @MaxLength(60)
  code: string;
}
