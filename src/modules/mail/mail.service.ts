import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendOrderConfirmation(order: Order, user: User): Promise<void> {
    try {
      const itemRows = (order.items || [])
        .map(
          (item) => `
          <tr>
            <td style="padding:12px;border-bottom:1px solid #efefef">${item.productName}</td>
            <td style="padding:12px;border-bottom:1px solid #efefef">${item.quantity}</td>
            <td style="padding:12px;border-bottom:1px solid #efefef;text-align:right">
              HK$${Number(item.totalPrice).toFixed(2)}
            </td>
          </tr>`,
        )
        .join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family:-apple-system,sans-serif;color:#1a1a1a;margin:0;padding:0;background:#f5f5f5">
          <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden">
            <div style="background:#1a1a1a;padding:32px;text-align:center">
              <h1 style="color:#fff;margin:0;font-size:24px;font-weight:500">My Store</h1>
            </div>
            <div style="padding:32px">
              <h2 style="font-size:20px;font-weight:500;margin-top:0">
                Thanks for your order, ${user.firstName || 'there'}!
              </h2>
              <p style="color:#666;font-size:14px">
                Order <strong>#${order.orderNumber}</strong> is confirmed and being processed.
              </p>
              <table style="width:100%;border-collapse:collapse;margin:24px 0">
                <thead>
                  <tr>
                    <th style="text-align:left;padding:10px 12px;background:#f5f5f5;font-size:13px;color:#666">Item</th>
                    <th style="text-align:left;padding:10px 12px;background:#f5f5f5;font-size:13px;color:#666">Qty</th>
                    <th style="text-align:right;padding:10px 12px;background:#f5f5f5;font-size:13px;color:#666">Price</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
              </table>
              <table style="margin-left:auto;width:260px;border-collapse:collapse">
                <tr>
                  <td style="padding:8px;color:#666">Subtotal</td>
                  <td style="padding:8px;text-align:right;font-weight:500">HK$${Number(order.subtotal).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding:8px;color:#666">Shipping</td>
                  <td style="padding:8px;text-align:right;font-weight:500">HK$${Number(order.shippingCost).toFixed(2)}</td>
                </tr>
                ${
                  Number(order.discountAmount) > 0
                    ? `
                <tr>
                  <td style="padding:8px;color:#666">Discount</td>
                  <td style="padding:8px;text-align:right;font-weight:500;color:#16a34a">
                    -HK$${Number(order.discountAmount).toFixed(2)}
                  </td>
                </tr>`
                    : ''
                }
                <tr>
                  <td style="padding:8px;font-size:16px;font-weight:600;border-top:2px solid #1a1a1a">Total</td>
                  <td style="padding:8px;text-align:right;font-size:16px;font-weight:600;border-top:2px solid #1a1a1a">
                    HK$${Number(order.total).toFixed(2)}
                  </td>
                </tr>
              </table>
            </div>
            <div style="padding:24px 32px;background:#f5f5f5;text-align:center;font-size:13px;color:#999">
              Questions? Reply to this email and we will help you out.
            </div>
          </div>
        </body>
        </html>`;

      await this.mailerService.sendMail({
        to: user.email,
        subject: `Order confirmed — #${order.orderNumber}`,
        html,
      });

      this.logger.log(
        `Order confirmation sent to ${user.email} for #${order.orderNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send order confirmation to ${user.email}: ${error.message}`,
      );
    }
  }

  async sendWelcome(user: User): Promise<void> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family:-apple-system,sans-serif;color:#1a1a1a;margin:0;padding:0;background:#f5f5f5">
          <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden">
            <div style="background:#1a1a1a;padding:40px;text-align:center">
              <h1 style="color:#fff;margin:0;font-size:28px;font-weight:500">My Store</h1>
            </div>
            <div style="padding:40px;text-align:center">
              <h2 style="font-size:22px;font-weight:500;margin-top:0">
                Welcome, ${user.firstName || 'there'}!
              </h2>
              <p style="color:#666;font-size:15px;line-height:1.7">
                Your account has been created with <strong>${user.email}</strong>.<br>
                You are all set to start shopping.
              </p>
            </div>
            <div style="padding:24px;background:#f5f5f5;text-align:center;font-size:13px;color:#999">
              © ${new Date().getFullYear()} My Store. All rights reserved.
            </div>
          </div>
        </body>
        </html>`;

      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Welcome to My Store',
        html,
      });

      this.logger.log(`Welcome email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${user.email}: ${error.message}`,
      );
    }
  }

  async sendBirthdayCoupon(
    user: User,
    couponCode: string,
    expiresAt: Date,
    config: {
      emailSubject: string;
      emailMessage: string | null;
      couponType: string;
      couponValue: number;
    },
  ): Promise<void> {
    try {
      const firstName = user.firstName || 'there';
      const validUntil = expiresAt.toLocaleDateString('en-HK', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const discount =
        config.couponType === 'percentage'
          ? `${Number(config.couponValue).toFixed(0)}% off`
          : `HK$${Number(config.couponValue).toFixed(0)} off`;

      const customMessage = (config.emailMessage || '')
        .replace(/{{first_name}}/g, firstName)
        .replace(/{{coupon_code}}/g, couponCode)
        .replace(/{{valid_until}}/g, validUntil)
        .replace(/{{discount}}/g, discount);

      const subject = config.emailSubject.replace(/{{first_name}}/g, firstName);

      const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family:-apple-system,sans-serif;color:#1a1a1a;margin:0;padding:0;background:#f5f5f5">
          <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden">
            <div style="background:#1a1a1a;padding:40px;text-align:center">
              <h1 style="color:#fff;margin:0;font-size:28px;font-weight:500">My Store</h1>
            </div>
            <div style="padding:40px;text-align:center">
              <div style="font-size:56px;margin-bottom:8px">&#127874;</div>
              <h2 style="font-size:24px;font-weight:500;margin:0 0 8px">
                Happy Birthday, ${firstName}!
              </h2>
              <p style="color:#666;font-size:15px;line-height:1.7;margin:0 0 32px">
                ${customMessage || `To celebrate your special day, here is a <strong>${discount}</strong> birthday gift from us.`}
              </p>
              <div style="background:#f5f5f5;border-radius:8px;padding:28px;margin-bottom:32px">
                <p style="margin:0 0 8px;font-size:13px;color:#999;text-transform:uppercase;letter-spacing:1px">
                  Your exclusive birthday coupon
                </p>
                <div style="font-size:28px;font-weight:700;letter-spacing:4px;color:#1a1a1a;font-family:monospace">
                  ${couponCode}
                </div>
                <p style="margin:12px 0 0;font-size:13px;color:#999">
                  Valid until ${validUntil}
                </p>
              </div>
              <p style="color:#888;font-size:13px;line-height:1.6">
                Enter this code at checkout to redeem your ${discount} discount.<br>
                Single use, non-transferable.
              </p>
            </div>
            <div style="padding:24px;background:#f5f5f5;text-align:center;font-size:13px;color:#999">
              © ${new Date().getFullYear()} My Store. All rights reserved.
            </div>
          </div>
        </body>
        </html>`;

      await this.mailerService.sendMail({ to: user.email, subject, html });
      this.logger.log(
        `Birthday coupon email sent to ${user.email} — code: ${couponCode}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send birthday coupon to ${user.email}: ${error.message}`,
      );
    }
  }
}
