import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT ?? '587', 10),
  user: process.env.MAIL_USER,
  password: process.env.MAIL_PASSWORD,
  fromName: process.env.MAIL_FROM_NAME || 'My Store',
  fromAddress: process.env.MAIL_FROM_ADDRESS || 'noreply@mystore.com',
}));
