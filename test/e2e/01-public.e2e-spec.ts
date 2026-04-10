import request = require('supertest');
import { createTestApp, closeTestApp, asAdmin, asJane, IDS } from '../helpers/test-app';
import { INestApplication } from '@nestjs/common';

let app: INestApplication;

beforeAll(async () => { app = await createTestApp(); });
afterAll(async () => { await closeTestApp(); });

// ══════════════════════════════════════════════════════════════════════════════
// HEALTH
// ══════════════════════════════════════════════════════════════════════════════
describe('Health', () => {
  it('GET /health → 200 with db + memory status', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.info).toHaveProperty('database');
    expect(res.body.info).toHaveProperty('memory_heap');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════════════════════════════════════════
describe('Categories', () => {
  it('GET /categories → lists top-level categories with children', async () => {
    const res = await request(app.getHttpServer()).get('/categories').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);
    const skincare = res.body.find((c: any) => c.id === IDS.catSkincare);
    expect(skincare).toBeDefined();
    expect(skincare.children.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /categories/:id → returns single category', async () => {
    const res = await request(app.getHttpServer())
      .get(`/categories/${IDS.catMakeup}`).expect(200);
    expect(res.body.slug).toBe('makeup');
  });

  it('GET /categories/:id → 404 for unknown id', async () => {
    await request(app.getHttpServer())
      .get('/categories/550e8400-e29b-41d4-a716-446655440099').expect(404);
  });

  let createdCatId: string;
  it('POST /categories → admin can create', async () => {
    const res = await asAdmin(app).post('/categories')
      .send({ name: 'Test Cat', slug: 'test-cat-e2e', isActive: true })
      .expect(201);
    expect(res.body.slug).toBe('test-cat-e2e');
    createdCatId = res.body.id;
  });

  it('POST /categories → 403 for customer', async () => {
    await asJane(app).post('/categories')
      .send({ name: 'Hack', slug: 'hack-e2e' }).expect(403);
  });

  it('PATCH /categories/:id → admin can update', async () => {
    if (!createdCatId) return;
    const res = await asAdmin(app).patch(`/categories/${createdCatId}`)
      .send({ description: 'Updated description' }).expect(200);
    expect(res.body.description).toBe('Updated description');
  });

  it('DELETE /categories/:id → admin can delete', async () => {
    if (!createdCatId) return;
    await asAdmin(app).delete(`/categories/${createdCatId}`).expect(200);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════════════════════════════════════
describe('Products', () => {
  it('GET /products → returns paginated list', async () => {
    const res = await request(app.getHttpServer()).get('/products').expect(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.meta.total).toBeGreaterThan(0);  // paginate util uses meta.total
  });

  it('GET /products/:id → returns product detail', async () => {
    const res = await request(app.getHttpServer())
      .get(`/products/${IDS.prodMoisturiser}`).expect(200);
    expect(res.body.sku).toBe('SKN-MOI-001');
    expect(res.body.basePrice).toBeDefined();
  });

  it('GET /products/slug/:slug → finds by slug', async () => {
    const res = await request(app.getHttpServer())
      .get('/products/slug/vitamin-c-brightening-serum').expect(200);
    expect(res.body.id).toBe(IDS.prodSerum);
  });

  it('GET /products/:id → 404 for unknown product', async () => {
    await request(app.getHttpServer())
      .get('/products/550e8400-e29b-41d4-a716-446655440099').expect(404);
  });

  let createdProductId: string;
  it('POST /products → admin can create product', async () => {
    const res = await asAdmin(app).post('/products').send({
      name: 'Test Cream E2E',
      slug: 'test-cream-e2e',
      basePrice: 99.00,
      sku: 'TEST-CRM-E2E',
      isActive: true,
    }).expect(201);
    expect(res.body.sku).toBe('TEST-CRM-E2E');
    createdProductId = res.body.id;
  });

  it('PATCH /products/:id → admin can update product', async () => {
    if (!createdProductId) return;
    const res = await asAdmin(app).patch(`/products/${createdProductId}`)
      .send({ basePrice: 129.00 }).expect(200);
    expect(parseFloat(res.body.basePrice)).toBe(129);
  });

  it('DELETE /products/:id → admin soft-deletes', async () => {
    if (!createdProductId) return;
    await asAdmin(app).delete(`/products/${createdProductId}`).expect(200);
  });

  it('POST /products → 403 for customer', async () => {
    await asJane(app).post('/products')
      .send({ name: 'X', slug: 'x', basePrice: 1, sku: 'X-001' }).expect(403);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SEARCH
// ══════════════════════════════════════════════════════════════════════════════
describe('Search', () => {
  it('GET /search?q=moisturiser → returns matching products', async () => {
    const res = await request(app.getHttpServer())
      .get('/search?q=moisturiser').expect(200);
    expect(res.body.results).toBeDefined();  // search returns { results, total, ... }
    expect(res.body.results.length).toBeGreaterThan(0);
  });

  it('GET /search?q=xxxxnotexist → returns empty results', async () => {
    const res = await request(app.getHttpServer())
      .get('/search?q=xxxxnotexist').expect(200);
    expect(res.body.results.length).toBe(0);
  });

  it('GET /search/suggest?q=vita → returns suggestions', async () => {
    const res = await request(app.getHttpServer())
      .get('/search/suggest?q=vita').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
