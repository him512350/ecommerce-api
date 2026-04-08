import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// ── SMTP config ───────────────────────────────────────────────────────────────

export class UpdateSmtpConfigDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'smtp.gmail.com' }) @IsOptional() @IsString() @MaxLength(200)
  host?: string;

  @ApiPropertyOptional({ example: 587 }) @IsOptional() @IsInt() @Min(1) @Max(65535)
  port?: number;

  @ApiPropertyOptional({ description: 'true = SSL/TLS (port 465); false = STARTTLS (port 587)' })
  @IsOptional() @IsBoolean()
  secure?: boolean;

  @ApiPropertyOptional({ example: 'you@gmail.com' }) @IsOptional() @IsString() @MaxLength(200)
  username?: string;

  @ApiPropertyOptional({ description: 'App password — stored as-is, admin-only access' })
  @IsOptional() @IsString() @MaxLength(500)
  password?: string;

  @ApiPropertyOptional({ example: 'My Store' }) @IsOptional() @IsString() @MaxLength(100)
  fromName?: string;

  @ApiPropertyOptional({ example: 'noreply@mystore.com' }) @IsOptional() @IsEmail()
  fromEmail?: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail()
  replyTo?: string;
}

export class SendTestEmailDto {
  @ApiProperty({ example: 'admin@mystore.com' })
  @IsEmail()
  to: string;
}

// ── Template ──────────────────────────────────────────────────────────────────

export class UpdateTemplateDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Email subject — supports {{placeholder}} syntax' })
  @IsOptional() @IsString() @MaxLength(300)
  subject?: string;

  @ApiPropertyOptional({ description: 'Full HTML email body — supports {{placeholder}} syntax' })
  @IsOptional() @IsString()
  bodyHtml?: string;
}
