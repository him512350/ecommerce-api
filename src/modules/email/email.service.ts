import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import * as nodemailer from 'nodemailer';
import { EmailSmtpConfig } from './entities/email-smtp-config.entity';
import { EmailTemplate } from './entities/email-template.entity';
import { EmailType } from '../../common/enums';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  // Cached transporter — rebuilt when SMTP config changes
  private transporterCache: nodemailer.Transporter | null = null;
  private transporterConfigKey = '';

  constructor(
    @InjectRepository(EmailSmtpConfig)
    private readonly smtpRepo: Repository<EmailSmtpConfig>,
    @InjectRepository(EmailTemplate)
    private readonly templateRepo: Repository<EmailTemplate>,
    private readonly fallbackMailer: MailerService,
  ) {}

  // ── Core send method — called by all services ─────────────────────────────

  async send(
    type: string,
    to: string | string[],
    variables: Record<string, string | number>,
  ): Promise<void> {
    const template = await this.templateRepo.findOne({ where: { type } });
    if (!template) {
      this.logger.warn(`No template found for type "${type}" — email not sent`);
      return;
    }
    if (!template.isEnabled) {
      this.logger.debug(`Email type "${type}" is disabled — skipping`);
      return;
    }

    const vars = Object.fromEntries(
      Object.entries(variables).map(([k, v]) => [k, String(v)]),
    );

    const subject = this.replacePlaceholders(template.subject,  vars);
    const html    = this.replacePlaceholders(template.bodyHtml, vars);

    await this.sendRaw(to, subject, html);
  }

  // ── Admin: send test email with dummy data ────────────────────────────────

  async sendTestForTemplate(type: string, to: string): Promise<void> {
    const template = await this.templateRepo.findOne({ where: { type } });
    if (!template) throw new Error(`Template not found: ${type}`);

    // Fill all placeholders with example values
    const dummyVars: Record<string, string> = {};
    for (const p of template.availablePlaceholders) {
      dummyVars[p.key] = p.example;
    }

    const subject = this.replacePlaceholders(template.subject, dummyVars) + ' [TEST]';
    const html    = this.replacePlaceholders(template.bodyHtml, dummyVars);
    await this.sendRaw(to, subject, html);
  }

  // ── Admin: test SMTP connection ───────────────────────────────────────────

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const transporter = await this.getDynamicTransporter();
      if (!transporter) return { success: false, message: 'No active SMTP config — using .env fallback' };
      await transporter.verify();
      return { success: true, message: 'SMTP connection verified successfully' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  // ── Admin: send a plain test email ───────────────────────────────────────

  async sendTestEmail(to: string): Promise<void> {
    const smtpConfig = await this.getSmtpConfig();
    const fromName   = smtpConfig?.fromName ?? 'My Store';
    await this.sendRaw(
      to,
      `${fromName} — SMTP test email`,
      `<p>This is a test email from <strong>${fromName}</strong>.</p>
       <p>If you received this, your SMTP settings are working correctly.</p>`,
    );
  }

  // ── Internal: raw send ────────────────────────────────────────────────────

  async sendRaw(
    to: string | string[],
    subject: string,
    html: string,
  ): Promise<void> {
    try {
      const dynamic = await this.getDynamicTransporter();

      if (dynamic) {
        const smtpConfig = await this.getSmtpConfig();
        const from = smtpConfig?.fromEmail
          ? `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`
          : smtpConfig?.fromName ?? 'My Store';

        await dynamic.sendMail({ from, to, subject, html });
      } else {
        // Fall back to @nestjs-modules/mailer (configured via .env)
        await this.fallbackMailer.sendMail({ to, subject, html });
      }

      this.logger.log(`Email sent → ${Array.isArray(to) ? to.join(', ') : to} | ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email: ${err.message}`);
    }
  }

  // ── SMTP config helpers ───────────────────────────────────────────────────

  async getSmtpConfig(): Promise<EmailSmtpConfig | null> {
    const rows = await this.smtpRepo.find({ take: 1 });
    return rows[0] ?? null;
  }

  async upsertSmtpConfig(dto: Partial<EmailSmtpConfig>): Promise<EmailSmtpConfig> {
    const config = (await this.getSmtpConfig()) ?? this.smtpRepo.create({});
    Object.assign(config, dto);
    const saved = await this.smtpRepo.save(config);
    // Invalidate transporter cache so next send uses new config
    this.transporterCache    = null;
    this.transporterConfigKey = '';
    return saved;
  }

  async deleteSmtpConfig(): Promise<void> {
    const config = await this.getSmtpConfig();
    if (config) await this.smtpRepo.remove(config);
    this.transporterCache    = null;
    this.transporterConfigKey = '';
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  async getAllTemplates(): Promise<EmailTemplate[]> {
    return this.templateRepo.find({ order: { type: 'ASC' } });
  }

  async getTemplate(type: string): Promise<EmailTemplate> {
    const t = await this.templateRepo.findOne({ where: { type } });
    if (!t) throw new Error(`Template not found: ${type}`);
    return t;
  }

  async updateTemplate(
    type: string,
    dto: { isEnabled?: boolean; subject?: string; bodyHtml?: string },
  ): Promise<EmailTemplate> {
    const t = await this.getTemplate(type);
    if (dto.isEnabled !== undefined) t.isEnabled = dto.isEnabled;
    if (dto.subject  !== undefined) t.subject   = dto.subject;
    if (dto.bodyHtml !== undefined) t.bodyHtml  = dto.bodyHtml;
    return this.templateRepo.save(t);
  }

  async resetTemplate(type: string): Promise<EmailTemplate> {
    const t = await this.getTemplate(type);
    t.subject  = t.defaultSubject;
    t.bodyHtml = t.defaultBodyHtml;
    return this.templateRepo.save(t);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async getDynamicTransporter(): Promise<nodemailer.Transporter | null> {
    const config = await this.getSmtpConfig();
    if (!config?.isActive || !config.host || !config.username || !config.password) {
      return null;
    }

    const cacheKey = `${config.host}:${config.port}:${config.username}:${config.updatedAt}`;
    if (this.transporterConfigKey === cacheKey && this.transporterCache) {
      return this.transporterCache;
    }

    this.transporterCache = nodemailer.createTransport({
      host:   config.host,
      port:   config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });
    this.transporterConfigKey = cacheKey;
    return this.transporterCache;
  }

  private replacePlaceholders(text: string, vars: Record<string, string>): string {
    return text.replace(/{{(\w+)}}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }
}
