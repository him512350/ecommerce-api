import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// Singleton — one row.  Activated via is_active = true.
// When inactive the system falls back to the SMTP settings in .env.
@Entity('email_smtp_config')
export class EmailSmtpConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Set to true to use this config instead of .env settings
  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  // e.g. smtp.gmail.com | smtp.mailgun.org | smtp.sendgrid.net
  @Column({ length: 200, default: '' })
  host: string;

  // 587 (STARTTLS) | 465 (SSL) | 25 (plain)
  @Column({ default: 587 })
  port: number;

  // true = SSL/TLS directly (port 465); false = STARTTLS (port 587)
  @Column({ default: false })
  secure: boolean;

  // SMTP username — usually your email address
  @Column({ length: 200, default: '' })
  username: string;

  // App password or SMTP password — stored plaintext (admin-accessible only)
  @Column({ length: 500, default: '' })
  password: string;

  // Display name shown in the "From:" header
  @Column({ name: 'from_name', length: 100, default: 'My Store' })
  fromName: string;

  // From email address — must be verified with the SMTP provider
  @Column({ name: 'from_email', length: 200, default: '' })
  fromEmail: string;

  // Optional: override "Reply-To" header
  @Column({ name: 'reply_to', length: 200, nullable: true })
  replyTo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
