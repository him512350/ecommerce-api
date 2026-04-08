import { MigrationInterface, QueryRunner } from 'typeorm';

const WRAPPER = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;margin:0;padding:0;background:#f5f5f5">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
    <div style="background:#1a1a1a;padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:500">{{store_name}}</h1>
    </div>
    <div style="padding:40px">${content}</div>
    <div style="padding:24px 40px;background:#f5f5f5;text-align:center;font-size:12px;color:#999">
      © {{year}} {{store_name}}. All rights reserved.
    </div>
  </div>
</body></html>`;

const ORDER_ITEMS_NOTE = '<!-- {{order_items_html}} will be replaced with a formatted table of order lines -->';

const TEMPLATES = [
  {
    type: 'order_confirmed',
    name: 'Order Confirmed (customer)',
    description: 'Sent to the customer immediately after a successful order placement.',
    is_enabled: true,
    recipient_type: 'customer',
    subject: 'Your order #{{order_number}} is confirmed!',
    body: WRAPPER(`
      <h2 style="font-size:20px;font-weight:500;margin-top:0">Thanks for your order, {{first_name}}!</h2>
      <p style="color:#555;line-height:1.7">Your order <strong>#{{order_number}}</strong> has been received and is being prepared.</p>
      ${ORDER_ITEMS_NOTE}
      {{order_items_html}}
      <table style="margin:24px 0 0 auto;width:240px;border-collapse:collapse">
        <tr><td style="padding:6px;color:#666">Subtotal</td><td style="padding:6px;text-align:right">{{currency}}{{subtotal}}</td></tr>
        <tr><td style="padding:6px;color:#666">Shipping</td><td style="padding:6px;text-align:right">{{currency}}{{shipping_cost}}</td></tr>
        <tr><td style="padding:6px;color:#666;font-weight:600;border-top:2px solid #1a1a1a">Total</td>
            <td style="padding:6px;text-align:right;font-weight:600;border-top:2px solid #1a1a1a">{{currency}}{{order_total}}</td></tr>
      </table>
    `),
    placeholders: [
      { key: 'first_name', description: 'Customer first name', example: 'Jane' },
      { key: 'order_number', description: 'Order number', example: 'ORD-1712345678901' },
      { key: 'order_total', description: 'Order total amount', example: '258.00' },
      { key: 'subtotal', description: 'Order subtotal', example: '230.00' },
      { key: 'shipping_cost', description: 'Shipping cost', example: '28.00' },
      { key: 'currency', description: 'Currency symbol', example: 'HK$' },
      { key: 'order_items_html', description: 'HTML table of order items', example: '' },
      { key: 'store_name', description: 'Store name', example: 'My Store' },
      { key: 'year', description: 'Current year', example: '2026' },
    ],
  },
  {
    type: 'order_processing',
    name: 'Order Processing (customer)',
    description: 'Sent when the admin marks the order as "Processing".',
    is_enabled: true,
    recipient_type: 'customer',
    subject: 'We are preparing your order #{{order_number}}',
    body: WRAPPER(`
      <h2 style="font-size:20px;font-weight:500;margin-top:0">Your order is being prepared, {{first_name}}!</h2>
      <p style="color:#555;line-height:1.7">Order <strong>#{{order_number}}</strong> is now being processed by our team. We'll let you know when it ships.</p>
    `),
    placeholders: [
      { key: 'first_name', description: 'Customer first name', example: 'Jane' },
      { key: 'order_number', description: 'Order number', example: 'ORD-1712345678901' },
      { key: 'store_name', description: 'Store name', example: 'My Store' },
      { key: 'year', description: 'Current year', example: '2026' },
    ],
  },
  {
    type: 'order_shipped',
    name: 'Order Shipped (customer)',
    description: 'Sent when the admin marks the order as shipped and enters a tracking number.',
    is_enabled: true,
    recipient_type: 'customer',
    subject: 'Your order #{{order_number}} is on its way!',
    body: WRAPPER(`
      <h2 style="font-size:20px;font-weight:500;margin-top:0">Your order is shipped, {{first_name}}!</h2>
      <p style="color:#555;line-height:1.7">Order <strong>#{{order_number}}</strong> is on its way to you. Expected delivery: <strong>{{estimated_days}}</strong>.</p>
      {{#if tracking_number}}
      <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin:24px 0">
        <p style="margin:0 0 8px;font-size:13px;color:#999;text-transform:uppercase;letter-spacing:1px">Tracking number</p>
        <p style="margin:0;font-size:18px;font-weight:600;font-family:monospace">{{tracking_number}}</p>
        {{#if tracking_url}}<p style="margin:12px 0 0"><a href="{{tracking_url}}" style="color:#1a1a1a">Track your package →</a></p>{{/if}}
      </div>
      {{/if}}
    `),
    placeholders: [
      { key: 'first_name', description: 'Customer first name', example: 'Jane' },
      { key: 'order_number', description: 'Order number', example: 'ORD-1712345678901' },
      { key: 'tracking_number', description: 'Carrier tracking number', example: 'SF1234567890' },
      { key: 'tracking_url', description: 'Carrier tracking URL', example: 'https://track.example.com' },
      { key: 'estimated_days', description: 'Estimated delivery time', example: '2-3 working days' },
      { key: 'store_name', description: 'Store name', example: 'My Store' },
      { key: 'year', description: 'Current year', example: '2026' },
    ],
  },
  {
    type: 'order_completed',
    name: 'Order Completed (customer)',
    description: 'Sent when the order is marked as delivered/completed.',
    is_enabled: true,
    recipient_type: 'customer',
    subject: 'Your order #{{order_number}} is complete — leave a review!',
    body: WRAPPER(`
      <h2 style="font-size:20px;font-weight:500;margin-top:0">Your order has arrived, {{first_name}}!</h2>
      <p style="color:#555;line-height:1.7">We hope you love your order <strong>#{{order_number}}</strong>. If you have a moment, we'd love to hear your thoughts.</p>
      <p style="color:#555;line-height:1.7">You earned <strong>{{points_earned}} points</strong> from this order. Your current balance is <strong>{{points_balance}} points</strong>.</p>
    `),
    placeholders: [
      { key: 'first_name', description: 'Customer first name', example: 'Jane' },
      { key: 'order_number', description: 'Order number', example: 'ORD-1712345678901' },
      { key: 'points_earned', description: 'Points earned from this order', example: '258' },
      { key: 'points_balance', description: 'Updated points balance', example: '1050' },
      { key: 'store_name', description: 'Store name', example: 'My Store' },
      { key: 'year', description: 'Current year', example: '2026' },
    ],
  },
  {
    type: 'order_cancelled',
    name: 'Order Cancelled (customer)',
    description: 'Sent to the customer when their order is cancelled.',
    is_enabled: true,
    recipient_type: 'customer',
    subject: 'Your order #{{order_number}} has been cancelled',
    body: WRAPPER(`
      <h2 style="font-size:20px;font-weight:500;margin-top:0">Order cancelled, {{first_name}}</h2>
      <p style="color:#555;line-height:1.7">Your order <strong>#{{order_number}}</strong> ({{currency}}{{order_total}}) has been cancelled.</p>
      <p style="color:#555;line-height:1.7">If a payment was made, a refund will be processed within 5-10 business days. If you have questions, please contact us.</p>
    `),
    placeholders: [
      { key: 'first_name', description: 'Customer first name', example: 'Jane' },
      { key: 'order_number', description: 'Order number', example: 'ORD-1712345678901' },
      { key: 'order_total', description: 'Order total', example: '258.00' },
      { key: 'currency', description: 'Currency symbol', example: 'HK$' },
      { key: 'store_name', description: 'Store name', example: 'My Store' },
      { key: 'year', description: 'Current year', example: '2026' },
    ],
  },
  {
    type: 'order_refunded',
    name: 'Order Refunded (customer)',
    description: 'Sent when a refund is issued.',
    is_enabled: true,
    recipient_type: 'customer',
    subject: 'Refund issued for order #{{order_number}}',
    body: WRAPPER(`
      <h2 style="font-size:20px;font-weight:500;margin-top:0">Your refund is on its way, {{first_name}}</h2>
      <p style="color:#555;line-height:1.7">A refund of <strong>{{currency}}{{refund_amount}}</strong> has been issued for order <strong>#{{order_number}}</strong>.</p>
      <p style="color:#555;line-height:1.7">Please allow 5-10 business days for the refund to appear on your original payment method.</p>
    `),
    placeholders: [
      { key: 'first_name', description: 'Customer first name', example: 'Jane' },
      { key: 'order_number', description: 'Order number', example: 'ORD-1712345678901' },
      { key: 'refund_amount', description: 'Refund amount', example: '258.00' },
      { key: 'currency', description: 'Currency symbol', example: 'HK$' },
      { key: 'store_name', description: 'Store name', example: 'My Store' },
      { key: 'year', description: 'Current year', example: '2026' },
    ],
  },
  {
    type: 'order_new_admin',
    name: 'New Order Alert (admin)',
    description: 'Sent to the admin email when a new order is placed.',
    is_enabled: true,
    recipient_type: 'admin',
    subject: 'New order #{{order_number}} — {{currency}}{{order_total}}',
    body: WRAPPER(`
      <h2 style="font-size:20px;font-weight:500;margin-top:0">New order received</h2>
      <p style="color:#555">Order <strong>#{{order_number}}</strong> from <strong>{{customer_name}}</strong> ({{customer_email}}) — <strong>{{currency}}{{order_total}}</strong>.</p>
      {{order_items_html}}
    `),
    placeholders: [
      { key: 'order_number', description: 'Order number', example: 'ORD-1712345678901' },
      { key: 'order_total', description: 'Order total', example: '258.00' },
      { key: 'currency', description: 'Currency symbol', example: 'HK$' },
      { key: 'customer_name', description: 'Customer full name', example: 'Jane Doe' },
      { key: 'customer_email', description: 'Customer email', example: 'jane@example.com' },
      { key: 'order_items_html', description: 'HTML table of order items', example: '' },
      { key: 'store_name', description: 'Store name', example: 'My Store' },
      { key: 'year', description: 'Current year', example: '2026' },
    ],
  },
  {
    type: 'welcome',
    name: 'Welcome (customer)',
    description: 'Sent when a customer creates a new account.',
    is_enabled: true,
    recipient_type: 'customer',
    subject: 'Welcome to {{store_name}}, {{first_name}}!',
    body: WRAPPER(`
      <div style="text-align:center">
        <h2 style="font-size:22px;font-weight:500;margin-top:0">Welcome, {{first_name}}! 🎉</h2>
        <p style="color:#555;font-size:15px;line-height:1.7">Your account has been created with <strong>{{email}}</strong>. You're all set to start shopping.</p>
      </div>
    `),
    placeholders: [
      { key: 'first_name', description: 'Customer first name', example: 'Jane' },
      { key: 'email', description: 'Customer email address', example: 'jane@example.com' },
      { key: 'store_name', description: 'Store name', example: 'My Store' },
      { key: 'year', description: 'Current year', example: '2026' },
    ],
  },
  {
    type: 'birthday_coupon',
    name: 'Birthday Coupon (customer)',
    description: 'Sent on or before the customer\'s birthday with a unique discount code.',
    is_enabled: true,
    recipient_type: 'customer',
    subject: 'Happy Birthday {{first_name}}! 🎂 Your gift is inside',
    body: WRAPPER(`
      <div style="text-align:center">
        <div style="font-size:56px;margin-bottom:8px">🎂</div>
        <h2 style="font-size:24px;font-weight:500;margin:0 0 8px">Happy Birthday, {{first_name}}!</h2>
        <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 32px">{{custom_message}}</p>
        <div style="background:#f5f5f5;border-radius:8px;padding:28px;margin-bottom:32px">
          <p style="margin:0 0 8px;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:1px">Your exclusive birthday coupon</p>
          <div style="font-size:28px;font-weight:700;letter-spacing:4px;color:#1a1a1a;font-family:monospace">{{coupon_code}}</div>
          <p style="margin:12px 0 0;font-size:13px;color:#999">Valid until {{valid_until}}</p>
        </div>
        <p style="color:#888;font-size:13px">{{discount}} discount · Single use · Non-transferable</p>
      </div>
    `),
    placeholders: [
      { key: 'first_name', description: 'Customer first name', example: 'Jane' },
      { key: 'coupon_code', description: 'Unique birthday coupon code', example: 'BDAY-A1B2C3-2026' },
      { key: 'discount', description: 'Discount description', example: '15% off' },
      { key: 'valid_until', description: 'Expiry date', example: '15 July 2026' },
      { key: 'custom_message', description: 'Custom admin message', example: 'Enjoy a special gift on your birthday!' },
      { key: 'store_name', description: 'Store name', example: 'My Store' },
      { key: 'year', description: 'Current year', example: '2026' },
    ],
  },
  {
    type: 'tier_upgraded',
    name: 'Tier Upgrade (customer)',
    description: 'Sent when a customer is automatically upgraded to a higher tier (e.g. VIP).',
    is_enabled: true,
    recipient_type: 'customer',
    subject: 'Congratulations! You are now a {{tier_name}} member 🎉',
    body: WRAPPER(`
      <div style="text-align:center">
        <div style="font-size:48px;margin-bottom:8px">⭐</div>
        <h2 style="font-size:22px;font-weight:500;margin:0 0 8px">You've been upgraded, {{first_name}}!</h2>
        <p style="color:#555;font-size:15px;line-height:1.7">Welcome to <strong>{{tier_name}}</strong> membership! Your new benefits are active immediately.</p>
        <p style="color:#555;font-size:14px">Membership valid until: {{expires_at}}</p>
      </div>
    `),
    placeholders: [
      { key: 'first_name', description: 'Customer first name', example: 'Jane' },
      { key: 'tier_name', description: 'New tier display name', example: 'VIP' },
      { key: 'expires_at', description: 'Membership expiry date', example: '8 April 2027' },
      { key: 'store_name', description: 'Store name', example: 'My Store' },
      { key: 'year', description: 'Current year', example: '2026' },
    ],
  },
  {
    type: 'points_earned',
    name: 'Points Earned (customer)',
    description: 'Sent after a successful payment to notify the customer of points earned.',
    is_enabled: false, // off by default to reduce email noise
    recipient_type: 'customer',
    subject: 'You earned {{points_earned}} points from order #{{order_number}}',
    body: WRAPPER(`
      <h2 style="font-size:20px;font-weight:500;margin-top:0">You earned points, {{first_name}}!</h2>
      <p style="color:#555;line-height:1.7">You earned <strong>{{points_earned}} points</strong> from order <strong>#{{order_number}}</strong>.</p>
      <p style="color:#555;line-height:1.7">Your current balance: <strong>{{points_balance}} points</strong>.</p>
    `),
    placeholders: [
      { key: 'first_name', description: 'Customer first name', example: 'Jane' },
      { key: 'order_number', description: 'Order number', example: 'ORD-1712345678901' },
      { key: 'points_earned', description: 'Points earned from this order', example: '258' },
      { key: 'points_balance', description: 'Updated total balance', example: '1050' },
      { key: 'store_name', description: 'Store name', example: 'My Store' },
      { key: 'year', description: 'Current year', example: '2026' },
    ],
  },
];

export class EmailManagement1775142349153 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── email_smtp_config ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "email_smtp_config" (
        "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
        "is_active"   BOOLEAN      NOT NULL DEFAULT FALSE,
        "host"        VARCHAR(200) NOT NULL DEFAULT '',
        "port"        INTEGER      NOT NULL DEFAULT 587,
        "secure"      BOOLEAN      NOT NULL DEFAULT FALSE,
        "username"    VARCHAR(200) NOT NULL DEFAULT '',
        "password"    VARCHAR(500) NOT NULL DEFAULT '',
        "from_name"   VARCHAR(100) NOT NULL DEFAULT 'My Store',
        "from_email"  VARCHAR(200) NOT NULL DEFAULT '',
        "reply_to"    VARCHAR(200),
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_email_smtp_config" PRIMARY KEY ("id")
      )
    `);

    // ── email_templates ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "email_templates" (
        "id"                    UUID         NOT NULL DEFAULT gen_random_uuid(),
        "type"                  VARCHAR(60)  NOT NULL UNIQUE,
        "name"                  VARCHAR(120) NOT NULL,
        "description"           TEXT,
        "is_enabled"            BOOLEAN      NOT NULL DEFAULT TRUE,
        "recipient_type"        VARCHAR(20)  NOT NULL DEFAULT 'customer',
        "subject"               VARCHAR(300) NOT NULL,
        "body_html"             TEXT         NOT NULL,
        "default_subject"       VARCHAR(300) NOT NULL,
        "default_body_html"     TEXT         NOT NULL,
        "available_placeholders" JSONB       NOT NULL DEFAULT '[]',
        "created_at"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_email_templates" PRIMARY KEY ("id")
      )
    `);

    // ── Seed default templates ────────────────────────────────────────────────
    for (const t of TEMPLATES) {
      const clean = (s: string) => s.replace(/'/g, "''");
      await queryRunner.query(`
        INSERT INTO "email_templates"
          ("type","name","description","is_enabled","recipient_type",
           "subject","body_html","default_subject","default_body_html","available_placeholders")
        VALUES (
          '${t.type}',
          '${clean(t.name)}',
          '${clean(t.description)}',
          ${t.is_enabled},
          '${t.recipient_type}',
          '${clean(t.subject)}',
          '${clean(t.body)}',
          '${clean(t.subject)}',
          '${clean(t.body)}',
          '${JSON.stringify(t.placeholders).replace(/'/g, "''")}'
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "email_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "email_smtp_config"`);
  }
}
