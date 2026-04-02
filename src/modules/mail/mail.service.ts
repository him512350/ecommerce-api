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
              S$${Number(item.totalPrice).toFixed(2)}
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
                  <td style="padding:8px;text-align:right;font-weight:500">S$${Number(order.subtotal).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding:8px;color:#666">Tax (9% GST)</td>
                  <td style="padding:8px;text-align:right;font-weight:500">S$${Number(order.taxAmount).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding:8px;color:#666">Shipping</td>
                  <td style="padding:8px;text-align:right;font-weight:500">S$${Number(order.shippingCost).toFixed(2)}</td>
                </tr>
                ${Number(order.discountAmount) > 0 ? `
                <tr>
                  <td style="padding:8px;color:#666">Discount</td>
                  <td style="padding:8px;text-align:right;font-weight:500;color:#16a34a">
                    -S$${Number(order.discountAmount).toFixed(2)}
                  </td>
                </tr>` : ''}
                <tr>
                  <td style="padding:8px;font-size:16px;font-weight:600;border-top:2px solid #1a1a1a">Total</td>
                  <td style="padding:8px;text-align:right;font-size:16px;font-weight:600;border-top:2px solid #1a1a1a">
                    S$${Number(order.total).toFixed(2)}
                  </td>
                </tr>
              </table>
            </div>
            <div style="padding:24px 32px;background:#f5f5f5;text-align:center;font-size:13px;color:#999">
              Questions? Reply to this email and we'll help you out.
            </div>
          </div>
        </body>
        </html>`;

      await this.mailerService.sendMail({
        to: user.email,
        subject: `Order confirmed — #${order.orderNumber}`,
        html,
      });

      this.logger.log(`Order confirmation sent to ${user.email} for #${order.orderNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send order confirmation to ${user.email}: ${error.message}`);
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
                Welcome, ${user.firstName || 'there'}! 🎉
              </h2>
              <p style="color:#666;font-size:15px;line-height:1.7">
                Your account has been created with <strong>${user.email}</strong>.<br>
                You're all set to start shopping.
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
        subject: 'Welcome to My Store 🎉',
        html,
      });

      this.logger.log(`Welcome email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${user.email}: ${error.message}`);
    }
  }
}