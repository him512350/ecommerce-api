import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export interface EmailPlaceholder {
  key: string;        // e.g. 'first_name'
  description: string;// e.g. 'Customer first name'
  example: string;    // e.g. 'Jane'
}

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Matches EmailType enum — unique identifier for each email
  @Column({ unique: true, length: 60 })
  type: string;

  // Human-readable name shown in admin dashboard
  @Column({ length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Admin can toggle individual email types on/off
  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  // 'customer' | 'admin' | 'both'
  @Column({ name: 'recipient_type', length: 20, default: 'customer' })
  recipientType: string;

  // Email subject — supports {{placeholder}} syntax
  @Column({ length: 300 })
  subject: string;

  // Full HTML body — supports {{placeholder}} syntax
  @Column({ name: 'body_html', type: 'text' })
  bodyHtml: string;

  // Original defaults kept so admin can reset to default
  @Column({ name: 'default_subject', length: 300 })
  defaultSubject: string;

  @Column({ name: 'default_body_html', type: 'text' })
  defaultBodyHtml: string;

  // JSONB list of available placeholders for this template
  @Column({ name: 'available_placeholders', type: 'jsonb', default: '[]' })
  availablePlaceholders: EmailPlaceholder[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
