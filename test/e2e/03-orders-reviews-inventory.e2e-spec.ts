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

describe('Orders', () => {
  it('GET /orders → returns current user orders', async () => {
    const res = await asJane(app).get('/orders').expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /orders/:id → returns order detail for owner', async () => {
    const res = await asJane(app).get(`/orders/${IDS.orderJane1}`).expect(200);
    expect(res.body.orderNumber).toBe('ORD-2026040001');
  });

  // OrdersService adds userId to WHERE clause — returns 404, not 403
  it("GET /orders/:id → 404 when accessing another user's order", async () => {
    await asJohn(app).get(`/orders/${IDS.orderJane1}`).expect(404);
  });

  it('GET /orders/admin → admin sees all orders', async () => {
    const res = await asAdmin(app).get('/orders/admin').expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /orders/admin → 403 for customer', async () => {
    await asJane(app).get('/orders/admin').expect(403);
  });

  it('PATCH /orders/:id/status → admin updates order status', async () => {
    const res = await asAdmin(app)
      .patch(`/orders/${IDS.orderJohn1}/status`)
      .send({ status: 'shipped' })
      .expect(200);
    expect(res.body.status).toBe('shipped');
    await asAdmin(app)
      .patch(`/orders/${IDS.orderJohn1}/status`)
      .send({ status: 'processing' });
  });

  it('PATCH /orders/:id/status → 403 for customer', async () => {
    await asJane(app)
      .patch(`/orders/${IDS.orderJane1}/status`)
      .send({ status: 'cancelled' })
      .expect(403);
  });

  it('POST /orders → 400 when cart is empty', async () => {
    await asJohn(app)
      .post('/orders')
      .send({
        shippingAddressId: IDS.addrJohn,
      })
      .expect(400);
  });
});

describe('Reviews', () => {
  it('GET /reviews/products/:productId → returns product reviews', async () => {
    const res = await asJane(app)
      .get(`/reviews/products/${IDS.prodMoisturiser}`)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].rating).toBeGreaterThanOrEqual(1);
  });

  it('GET /reviews/products/:productId → empty for product with no reviews', async () => {
    const res = await asJane(app)
      .get(`/reviews/products/${IDS.prodCleanser}`)
      .expect(200);
    expect(res.body.data.length).toBe(0);
  });

  let newReviewId: string;
  it('POST /reviews → customer submits review', async () => {
    const res = await asJohn(app).post('/reviews').send({
      productId: IDS.prodMoisturiser,
      rating: 5,
      title: 'Excellent!',
      body: 'Really works well on my skin.',
    });
    if (res.status !== 201)
      console.error('🔴 REVIEW CREATE BODY:', JSON.stringify(res.body));
    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(5);
    newReviewId = res.body.id;
  });

  it('POST /reviews → 400 duplicate review on same product', async () => {
    // Jane already has a review for moisturiser (seeded)
    await asJane(app)
      .post('/reviews')
      .send({
        productId: IDS.prodMoisturiser,
        rating: 4,
        title: 'Good',
      })
      .expect(400);
  });

  it('DELETE /reviews/:id → owner can delete own review', async () => {
    if (!newReviewId) return;
    await asJohn(app).delete(`/reviews/${newReviewId}`).expect(200);
  });

  it('DELETE /reviews/:id → admin can delete any review', async () => {
    await asAdmin(app).delete(`/reviews/${IDS.reviewJane}`).expect(200);
  });
});

describe('Inventory', () => {
  it('GET /inventory/products/:productId → admin gets product inventory', async () => {
    const res = await asAdmin(app)
      .get(`/inventory/products/${IDS.prodMoisturiser}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].quantity).toBeGreaterThan(0);
  });

  it('GET /inventory/low-stock → admin gets low stock items', async () => {
    const res = await asAdmin(app).get('/inventory/low-stock').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('PATCH /inventory/:id → admin updates inventory quantity', async () => {
    const res = await asAdmin(app)
      .patch(`/inventory/${IDS.invMoisturiser}`)
      .send({ quantity: 250 })
      .expect(200);
    expect(res.body.quantity).toBe(250);
    await asAdmin(app)
      .patch(`/inventory/${IDS.invMoisturiser}`)
      .send({ quantity: 200 });
  });

  it('GET /inventory/products/:productId → 403 for customer', async () => {
    await asJane(app)
      .get(`/inventory/products/${IDS.prodMoisturiser}`)
      .expect(403);
  });
});
