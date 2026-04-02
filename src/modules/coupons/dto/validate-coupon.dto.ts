import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty({ example: 'SUMMER20' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Order subtotal to calculate discount' })
  @IsNumber()
  @Min(0)
  subtotal: number;
}
