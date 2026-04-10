import { INestApplication } from '@nestjs/common';
import { createTestApp, closeTestApp, asAdmin, asJane, asJohn, IDS } from '../helpers/test-app';

let app: INestApplication;

beforeAll(async () => { app = await createTestApp(); });
afterAll(async () => { await closeTestApp(); });

describe('Promotions', () => {
  it('GET /promotions → admin lists promotions', async () => {
    const res = await asAdmin(app).get('/promotions').expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /promotions → 403 for customer', async () => {
    await asJane(app).get('/promotions').expect(403);
  });

  it('GET /promotions/:id → admin gets single promotion', async () => {
    const res = await asAdmin(app)
      .get(`/promotions/${IDS.promotionSummer}`).expect(200);
    expect(res.body.code).toBe('SUMMER20');
  });

  let promoId: string;
  it('POST /promotions → admin creates promotion', async () => {
    const res = await asAdmin(app).post('/promotions').send({
      name: 'Test Promo',
      type: 'coupon',
      code: 'TESTPROMO',
      priority: 1,
      stackable: 'none',
      isActive: true,
      conditionGroups: [],
      actions: [{ type: 'fixed_discount', value: 30, target: 'order' }],
    }).expect(201);
    expect(res.body.code).toBe('TESTPROMO');
    promoId = res.body.id;
  });

  it('PATCH /promotions/:id/deactivate → admin deactivates', async () => {
    if (!promoId) return;
    const res = await asAdmin(app).patch(`/promotions/${promoId}/deactivate`).expect(200);
    expect(res.body.isActive).toBe(false);
  });

  it('PATCH /promotions/:id/activate → admin activates', async () => {
    if (!promoId) return;
    const res = await asAdmin(app).patch(`/promotions/${promoId}/activate`).expect(200);
    expect(res.body.isActive).toBe(true);
  });

  it('GET /promotions/:id/usage → returns usage logs', async () => {
    const res = await asAdmin(app)
      .get(`/promotions/${IDS.promotionSummer}/usage`).expect(200);
    expect(res.body.data).toBeDefined();
  });

  it('POST /promotions/segments/:userId → adds segment to user', async () => {
    await asAdmin(app).post(`/promotions/segments/${IDS.john}`)
      .send({ segment: 'loyal_tester' }).expect(201);
  });

  it('GET /promotions/segments/:userId → lists user segments', async () => {
    const res = await asAdmin(app)
      .get(`/promotions/segments/${IDS.john}`).expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('DELETE /promotions/segments/:userId/:segment → removes segment', async () => {
    await asAdmin(app)
      .delete(`/promotions/segments/${IDS.john}/loyal_tester`).expect(200);
  });

  it('DELETE /promotions/:id → admin deletes promotion', async () => {
    if (!promoId) return;
    await asAdmin(app).delete(`/promotions/${promoId}`).expect(200);
  });
});

describe('Shipping', () => {
  // ShippingOption shape: { methodId, methodName, description, estimatedDays, cost }
  it('GET /shipping/options?country=HK&subtotal=200 → public shipping options', async () => {
    const res = await asJane(app)
      .get('/shipping/options?country=HK&subtotal=200').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].cost).toBeDefined();
    expect(res.body[0].methodId).toBeDefined(); // ShippingOption uses methodId not id
  });

  it('GET /shipping/options?country=HK&subtotal=600 → free shipping tier', async () => {
    const res = await asJane(app)
      .get('/shipping/options?country=HK&subtotal=600').expect(200);
    const sf = res.body.find((m: any) => m.methodId === IDS.shippingMethodSF);
    expect(sf).toBeDefined();
    expect(sf.cost).toBe(0);
  });

  it('GET /shipping/zones → admin lists zones', async () => {
    const res = await asAdmin(app).get('/shipping/zones').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  let newZoneId: string;
  it('POST /shipping/zones → admin creates zone', async () => {
    const res = await asAdmin(app).post('/shipping/zones').send({
      name: 'Test Zone',
      countries: ['XX'],
      isActive: true,
    }).expect(201);
    newZoneId = res.body.id;
  });

  let newMethodId: string;
  it('POST /shipping/zones/:id/methods → admin creates method', async () => {
    if (!newZoneId) return;
    const res = await asAdmin(app)
      .post(`/shipping/zones/${newZoneId}/methods`).send({
        name: 'Test Delivery',
        estimatedDays: '3-5 days',
        isActive: true,
      }).expect(201);
    newMethodId = res.body.id;
  });

  let newRateId: string;
  it('POST /shipping/methods/:id/rates → admin creates rate', async () => {
    if (!newMethodId) return;
    const res = await asAdmin(app)
      .post(`/shipping/methods/${newMethodId}/rates`).send({
        conditionType: 'always',
        rateType: 'fixed',
        cost: 60,
      }).expect(201);
    newRateId = res.body.id;
  });

  it('PATCH /shipping/rates/:id → admin updates rate', async () => {
    if (!newRateId) return;
    const res = await asAdmin(app).patch(`/shipping/rates/${newRateId}`)
      .send({ cost: 75 }).expect(200);
    expect(parseFloat(res.body.cost)).toBe(75);
  });

  it('DELETE /shipping/rates/:id → admin deletes rate', async () => {
    if (!newRateId) return;
    await asAdmin(app).delete(`/shipping/rates/${newRateId}`).expect(200);
  });

  it('DELETE /shipping/methods/:id → admin deletes method', async () => {
    if (!newMethodId) return;
    await asAdmin(app).delete(`/shipping/methods/${newMethodId}`).expect(200);
  });

  it('DELETE /shipping/zones/:id → admin deletes zone', async () => {
    if (!newZoneId) return;
    await asAdmin(app).delete(`/shipping/zones/${newZoneId}`).expect(200);
  });
});

describe('Tiers', () => {
  it('GET /tiers/me → customer sees own tier', async () => {
    const res = await asJane(app).get('/tiers/me').expect(200);
    expect(res.body.tierName).toBe('vip');
  });

  it('GET /tiers/me/history → customer sees tier history', async () => {
    const res = await asJane(app).get('/tiers/me/history').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /tiers/configs → admin lists tier configs', async () => {
    const res = await asAdmin(app).get('/tiers/configs').expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /tiers/stats → admin gets membership stats', async () => {
    const res = await asAdmin(app).get('/tiers/stats').expect(200);
    expect(res.body).toBeDefined();
  });

  it('GET /tiers/members/:tierName → admin lists VIP members', async () => {
    const res = await asAdmin(app).get('/tiers/members/vip').expect(200);
    // getUsersInTier returns { items, total, page, limit }
    expect(res.body.items).toBeDefined();
  });

  it('GET /tiers/users/:userId/membership → admin gets user membership', async () => {
    const res = await asAdmin(app)
      .get(`/tiers/users/${IDS.jane}/membership`).expect(200);
    expect(res.body.tierName).toBe('vip');
  });

  it('PATCH /tiers/users/:userId/override → admin overrides tier', async () => {
    const res = await asAdmin(app)
      .patch(`/tiers/users/${IDS.john}/override`)
      .send({ tierName: 'vip', reason: 'manual_test' }).expect(200);
    expect(res.body.tierName).toBe('vip');
    await asAdmin(app).patch(`/tiers/users/${IDS.john}/override`)
      .send({ tierName: 'customer', reason: 'restore' });
  });
});

describe('Points', () => {
  // getWallet returns { balance, lifetimeEarned, ... }
  it('GET /points/me → customer sees own wallet', async () => {
    const res = await asJane(app).get('/points/me').expect(200);
    expect(res.body.balance).toBeGreaterThanOrEqual(0);
  });

  // getTransactions returns { items, total, page, limit }
  it('GET /points/me/transactions → customer sees own history', async () => {
    const res = await asJane(app).get('/points/me/transactions').expect(200);
    expect(res.body.items).toBeDefined();
  });

  it('GET /points/config → admin gets global config', async () => {
    const res = await asAdmin(app).get('/points/config').expect(200);
    expect(res.body.isEnabled).toBe(true);
  });

  it('PATCH /points/config → admin updates config', async () => {
    const res = await asAdmin(app).patch('/points/config')
      .send({ minPointsToRedeem: 150 }).expect(200);
    expect(res.body.minPointsToRedeem).toBe(150);
    await asAdmin(app).patch('/points/config').send({ minPointsToRedeem: 100 });
  });

  it('GET /points/role-configs → admin lists role configs', async () => {
    const res = await asAdmin(app).get('/points/role-configs').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // getStats returns { totalOutstanding, totalEarned, totalRedeemed, ... }
  it('GET /points/stats → admin gets global stats', async () => {
    const res = await asAdmin(app).get('/points/stats').expect(200);
    expect(res.body.totalOutstanding).toBeDefined();
  });

  it('GET /points/users/:userId → admin gets user wallet', async () => {
    const res = await asAdmin(app)
      .get(`/points/users/${IDS.jane}`).expect(200);
    expect(res.body.balance).toBeGreaterThanOrEqual(0);
  });

  // adjustPoints returns a PointsTransaction, not wallet
  it('POST /points/users/:userId/adjust → admin adjusts points', async () => {
    const res = await asAdmin(app)
      .post(`/points/users/${IDS.jane}/adjust`)
      .send({ points: 100, description: 'E2E test adjustment' }).expect(201);
    expect(res.body.points).toBe(100); // PointsTransaction.points
    await asAdmin(app).post(`/points/users/${IDS.jane}/adjust`)
      .send({ points: -100, description: 'E2E restore' });
  });

  // getAllTransactions returns { items, total, page, limit }
  it('GET /points/transactions → admin sees all transactions', async () => {
    const res = await asAdmin(app).get('/points/transactions').expect(200);
    expect(res.body.items).toBeDefined();
  });
});

describe('Birthday Coupon', () => {
  it('GET /birthday-coupon/config → admin gets config', async () => {
    const res = await asAdmin(app).get('/birthday-coupon/config').expect(200);
    expect(res.body.isEnabled).toBe(true);
    // DB returns decimal as string — parse for comparison
    expect(parseFloat(res.body.couponValue)).toBe(15);
  });

  it('PATCH /birthday-coupon/config → admin updates config', async () => {
    const res = await asAdmin(app).patch('/birthday-coupon/config')
      .send({ couponValue: 20 }).expect(200);
    expect(parseFloat(res.body.couponValue)).toBe(20);
    await asAdmin(app).patch('/birthday-coupon/config').send({ couponValue: 15 });
  });

  it('GET /birthday-coupon/logs → admin lists logs', async () => {
    const res = await asAdmin(app).get('/birthday-coupon/logs').expect(200);
    expect(res.body.data).toBeDefined();
  });

  it('GET /birthday-coupon/config → 403 for customer', async () => {
    await asJane(app).get('/birthday-coupon/config').expect(403);
  });
});

describe('Email Management', () => {
  it('GET /email/smtp-config → admin gets SMTP config', async () => {
    const res = await asAdmin(app).get('/email/smtp-config').expect(200);
    expect(res.body).not.toBeNull();
  });

  it('PATCH /email/smtp-config → admin updates SMTP config', async () => {
    const res = await asAdmin(app).patch('/email/smtp-config').send({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      username: 'test@gmail.com',
      password: 'testpass',
      fromName: 'Test Store',
      fromEmail: 'noreply@test.com',
      isActive: false,
    }).expect(200);
    expect(res.body.host).toBe('smtp.gmail.com');
  });

  it('GET /email/templates → admin lists all templates', async () => {
    const res = await asAdmin(app).get('/email/templates').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(11);
  });

  it('GET /email/templates/:type → admin gets single template', async () => {
    const res = await asAdmin(app)
      .get('/email/templates/order_confirmed').expect(200);
    expect(res.body.type).toBe('order_confirmed');
  });

  it('PATCH /email/templates/:type → admin updates template', async () => {
    const res = await asAdmin(app).patch('/email/templates/welcome')
      .send({ subject: 'Welcome to Our Store, {{first_name}}!' }).expect(200);
    expect(res.body.subject).toBe('Welcome to Our Store, {{first_name}}!');
  });

  it('POST /email/templates/:type/reset → admin resets to default', async () => {
    const res = await asAdmin(app)
      .post('/email/templates/welcome/reset').expect(201);
    expect(res.body.subject).toBeDefined();
  });

  it('GET /email/templates → 403 for customer', async () => {
    await asJane(app).get('/email/templates').expect(403);
  });
});
