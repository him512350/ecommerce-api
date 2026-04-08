import {
  Body, Controller, Delete, Get, Param,
  Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { SendTestEmailDto, UpdateSmtpConfigDto, UpdateTemplateDto } from './dto/email.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('Email Management')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  // ── SMTP Config ───────────────────────────────────────────────────────────

  @Get('smtp-config')
  @ApiOperation({ summary: 'Get SMTP configuration (password masked)' })
  async getSmtpConfig() {
    const config = await this.emailService.getSmtpConfig();
    if (!config) return null;
    // Mask password before returning
    return { ...config, password: config.password ? '••••••••' : '' };
  }

  @Patch('smtp-config')
  @ApiOperation({
    summary: 'Update SMTP configuration',
    description: `
Gmail: host=smtp.gmail.com, port=587, secure=false, use an App Password.
SendGrid: host=smtp.sendgrid.net, port=587, username=apikey, password=your_api_key.
Mailgun: host=smtp.mailgun.org, port=587.
    `.trim(),
  })
  updateSmtpConfig(@Body() dto: UpdateSmtpConfigDto) {
    return this.emailService.upsertSmtpConfig(dto as any);
  }

  @Delete('smtp-config')
  @ApiOperation({ summary: 'Remove DB SMTP config and revert to .env settings' })
  deleteSmtpConfig() {
    return this.emailService.deleteSmtpConfig();
  }

  @Post('smtp-config/test-connection')
  @ApiOperation({ summary: 'Verify SMTP connection without sending an email' })
  testConnection() {
    return this.emailService.testConnection();
  }

  @Post('smtp-config/send-test')
  @ApiOperation({ summary: 'Send a plain test email to verify delivery' })
  sendTestEmail(@Body() dto: SendTestEmailDto) {
    return this.emailService.sendTestEmail(dto.to);
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  @Get('templates')
  @ApiOperation({ summary: 'List all email templates with their enabled/disabled status' })
  listTemplates() {
    return this.emailService.getAllTemplates();
  }

  @Get('templates/:type')
  @ApiOperation({ summary: 'Get a single email template for editing' })
  getTemplate(@Param('type') type: string) {
    return this.emailService.getTemplate(type);
  }

  @Patch('templates/:type')
  @ApiOperation({
    summary: 'Update a template subject, body, or enabled state',
    description: 'Available placeholders for each type are listed in the template\'s availablePlaceholders field.',
  })
  updateTemplate(@Param('type') type: string, @Body() dto: UpdateTemplateDto) {
    return this.emailService.updateTemplate(type, dto);
  }

  @Post('templates/:type/send-test')
  @ApiOperation({ summary: 'Send a test email using this template filled with example data' })
  sendTemplateTest(
    @Param('type') type: string,
    @Body() dto: SendTestEmailDto,
  ) {
    return this.emailService.sendTestForTemplate(type, dto.to);
  }

  @Post('templates/:type/reset')
  @ApiOperation({ summary: 'Reset template subject and body to factory defaults' })
  resetTemplate(@Param('type') type: string) {
    return this.emailService.resetTemplate(type);
  }
}
