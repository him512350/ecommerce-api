import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  // ISO 4217 currency code used for Stripe PaymentIntents.
  // Defaults to Hong Kong Dollar. Override via PAYMENT_CURRENCY env var.
  paymentCurrency: (process.env.PAYMENT_CURRENCY || 'hkd').toLowerCase(),
  // Decimal tax rate applied during cart pricing (e.g. 0.08 = 8%).
  // Defaults to 0 — Hong Kong has no GST/VAT. Override via TAX_RATE env var.
  taxRate: parseFloat(process.env.TAX_RATE ?? '0'),
}));
