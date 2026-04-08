
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class ManualTierOverrideDto {
  @ApiProperty({
    example: 'vip',
    description: 'Set to "customer" to reset to base tier',
  })
  @IsString()
  @MaxLength(40)
  tierName: string;

  @ApiPropertyOptional({
    example: '2027-01-01T00:00:00Z',
    description: 'Leave blank to use default duration',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'Granted for offline event attendance' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
