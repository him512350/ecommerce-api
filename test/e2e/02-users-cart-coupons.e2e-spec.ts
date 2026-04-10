import { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  closeTestApp,
  asAdmin,
  asJane,
  asJohn,
  IDS,
} from '../helpers/test-app';

let app: INestApplication;

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await closeTestApp();
});

// ══════════════════════════════════════════════════════════════════════════════
// USERS
// ══════════════════════════════════════════════════════════════════════════════
describe('Users', () => {
  it('GET /users/me → returns current user profile', async () => {
    const res = await asJane(app).get('/users/me').expect(200);
    expect(res.body.email).toBe('jane@example.com');
    expect(res.body.role).toBe('customer');
  });

  it('PATCH /users/me → customer can update own profile', async () => {
    const res = await asJane(app)
      .patch('/users/me')
      .send({ firstName: 'Janet' })
      .expect(200);
    expect(res.body.firstName).toBe('Janet');
    await asJane(app).patch('/users/me').send({ firstName: 'Jane' });
  });

  it('GET /users → admin sees all users', async () => {
    const res = await asAdmin(app).get('/users').expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
  });

  it('GET /users → 403 for customer', async () => {
    await asJane(app).get('/users').expect(403);
  });

  it('GET /users/:id → admin can get specific user', async () => {
    const res = await asAdmin(app).get(`/users/${IDS.jane}`).expect(200);
    expect(res.body.id).toBe(IDS.jane);
  });

  it('GET /users/me/addresses → returns user addresses', async () => {
    const res = await asJane(app).get('/users/me/addresses').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  let newAddrId: string;
  it('POST /users/me/addresses → adds new address', async () => {
    const res = await asJohn(app)
      .post('/users/me/addresses')
      .send({
        label: 'Work',
        streetLine1: '1 Finance St',
        city: 'Hong Kong',
        postalCode: '000000',
        country: 'HK',
      })
      .expect(201);
    expect(res.body.label).toBe('Work');
    newAddrId = res.body.id;
  });

  it('DELETE /users/me/addresses/:id → removes address', async () => {
    if (!newAddrId) return;
    await asJohn(app).delete(`/users/me/addresses/${newAddrId}`).expect(200);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// COUPONS
// ══════════════════════════════════════════════════════════════════════════════
describe('Coupons', () => {
  it('GET /coupons → admin sees all coupons', async () => {
    const res = await asAdmin(app).get('/coupons').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /coupons → 403 for customer', async () => {
    await asJane(app).get('/coupons').expect(403);
  });

  it('POST /coupons/validate → valid coupon returns discount', async () => {
    const res = await asJane(app)
      .post('/coupons/validate')
      .send({ code: 'WELCOME10', subtotal: 200 })
      .expect(201);
    expect(res.body.discount).toBeGreaterThan(0);
    expect(res.body.coupon.code).toBe('WELCOME10');
  });

  it('POST /coupons/validate → expired coupon returns 404', async () => {
    // CouponsService throws NotFoundException for inactive/expired coupons
    await asJane(app)
      .post('/coupons/validate')
      .send({ code: 'EXPIRED10', subtotal: 100 })
      .expect(404);
  });

  it('POST /coupons/validate → invalid code returns 404', async () => {
    await asJane(app)
      .post('/coupons/validate')
      .send({ code: 'DOESNOTEXIST', subtotal: 100 })
      .expect(404);
  });

  let newCouponId: string;
  it('POST /coupons → admin creates coupon', async () => {
    const res = await asAdmin(app)
      .post('/coupons')
      .send({
        code: 'TESTCOUPON5',
        type: 'percentage',
        value: 5,
        minOrderAmount: 0,
        isActive: true,
      })
      .expect(201);
    expect(res.body.code).toBe('TESTCOUPON5');
    newCouponId = res.body.id;
  });

  it('DELETE /coupons/:id/deactivate → admin deactivates', async () => {
    if (!newCouponId) return;
    const res = await asAdmin(app)
      .delete(`/coupons/${newCouponId}/deactivate`)
      .expect(200);
    expect(res.body.isActive).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CART
// ══════════════════════════════════════════════════════════════════════════════
describe('Cart', () => {
  // Cart returns { cart: Cart, pricing: CartPricingResult }
  it('GET /cart → returns cart with items and pricing', async () => {
    const res = await asJane(app).get('/cart').expect(200);
    expect(res.body.cart).toBeDefined();
    expect(res.body.pricing).toBeDefined();
    expect(res.body.cart.items.length).toBeGreaterThanOrEqual(1);
  });

  let newItemId: string;
  it('POST /cart/items → adds item to cart, returns updated cart', async () => {
    const res = await asJohn(app).post('/cart/items').send({
      productId: IDS.prodCleanser,
      quantity: 1,
    });
    if (res.status !== 201)
      console.error('🔴 CART ADDITEM BODY:', JSON.stringify(res.body));
    expect(res.status).toBe(201);
    // addItem returns the full Cart object
    expect(res.body.id).toBeDefined();
    const item = res.body.items?.find(
      (i: any) => i.productId === IDS.prodCleanser,
    );
    expect(item).toBeDefined();
    newItemId = item?.id;
  });

  it('PATCH /cart/items/:id → updates quantity', async () => {
    if (!newItemId) return;
    const res = await asJohn(app)
      .patch(`/cart/items/${newItemId}`)
      .send({ quantity: 3 })
      .expect(200);
    expect(res.body.id).toBeDefined(); // returns updated Cart
  });

  it('DELETE /cart/items/:id → removes item', async () => {
    if (!newItemId) return;
    await asJohn(app).delete(`/cart/items/${newItemId}`).expect(200);
  });

  it('POST /cart/coupon → applies valid coupon', async () => {
    // SUMMER20 exists in the promotions table (type: coupon); WELCOME10 is in coupons table only
    const res = await asJane(app)
      .post('/cart/coupon')
      .send({ code: 'SUMMER20' });
    if (res.status !== 201)
      console.error('🔴 CART COUPON BODY:', JSON.stringify(res.body));
    expect(res.status).toBe(201);
    // CartPricingResult uses appliedPromotions[], not a top-level discountAmount
    expect(res.body.pricing.appliedPromotions.length).toBeGreaterThan(0);
  });

  it('DELETE /cart/coupon → removes coupon', async () => {
    const res = await asJane(app).delete('/cart/coupon').expect(200);
    expect(res.body.pricing).toBeDefined();
  });

  it('POST /cart/shipping → selects shipping method', async () => {
    const res = await asJane(app)
      .post('/cart/shipping')
      .send({ methodId: IDS.shippingMethodSF });
    if (res.status !== 201)
      console.error('🔴 CART SHIPPING BODY:', JSON.stringify(res.body));
    expect(res.status).toBe(201);
    expect(res.body.pricing).toBeDefined();
  });

  it('DELETE /cart/shipping → clears shipping selection', async () => {
    await asJane(app).delete('/cart/shipping').expect(200);
  });

  it('DELETE /cart → clears entire cart', async () => {
    await asJohn(app).delete('/cart').expect(200);
  });
});
