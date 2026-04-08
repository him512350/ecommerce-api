import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailSmtpConfig } from './entities/email-smtp-config.entity';
import { EmailTemplate } from './entities/email-template.entity';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EmailSmtpConfig, EmailTemplate])],
  providers: [EmailService],
  controllers: [EmailController],
  exports: [EmailService],
})
export class EmailModule {}
