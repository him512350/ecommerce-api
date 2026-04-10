import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { FirebaseAuthGuard } from '../../src/common/guards/firebase-auth.guard';
import { DataSource } from 'typeorm';
import request = require('supertest');

// ── Seed IDs (match global-setup.ts) ──────────────────────────────────────────
export const IDS = {
  admin: '00000000-0000-4000-8000-000000000001',
  jane: '00000000-0000-4000-8000-000000000002', // VIP customer, has cart+orders+points
  john: '00000000-0000-4000-8000-000000000003', // customer, has orders
  mary: '00000000-0000-4000-8000-000000000004', // customer, not verified

  addrJane: '10000000-0000-4000-8000-000000000001',
  addrJohn: '10000000-0000-4000-8000-000000000003',

  catSkincare: '20000000-0000-4000-8000-000000000001',
  catMakeup: '20000000-0000-4000-8000-000000000002',
  catMoisturise: '20000000-0000-4000-8000-000000000011',

  prodMoisturiser: '30000000-0000-4000-8000-000000000001',
  prodSerum: '30000000-0000-4000-8000-000000000002',
  prodCleanser: '30000000-0000-4000-8000-000000000003',
  prodFoundation: '30000000-0000-4000-8000-000000000004',
  prodLipstick: '30000000-0000-4000-8000-000000000005',
  prodBundle: '30000000-0000-4000-8000-000000000008',

  varFoundationIvory: '32000000-0000-4000-8000-000000000001',

  invMoisturiser: '33000000-0000-4000-8000-000000000001',

  couponWelcome10: '40000000-0000-4000-8000-000000000001',
  couponSave50: '40000000-0000-4000-8000-000000000002',

  cartJane: '50000000-0000-4000-8000-000000000001',
  cartItemMoisturiser: '51000000-0000-4000-8000-000000000001',

  orderJane1: '60000000-0000-4000-8000-000000000001', // delivered
  orderJane2: '60000000-0000-4000-8000-000000000002', // shipped
  orderJohn1: '60000000-0000-4000-8000-000000000003', // processing

  reviewJane: '80000000-0000-4000-8000-000000000001',

  promotionSummer: '90000000-0000-4000-8000-000000000001',

  tierConfigCustomer: 'a0000000-0000-4000-8000-000000000001',
  tierConfigVip: 'a0000000-0000-4000-8000-000000000002',

  shippingZoneHK: 'c0000000-0000-4000-8000-000000000001',
  shippingMethodSF: 'c1000000-0000-4000-8000-000000000001',
  shippingRateSF: 'c2000000-0000-4000-8000-000000000001',
};

// ── Mock Firebase Guard ────────────────────────────────────────────────────────
// Reads `x-e2e-user-id` header and injects the matching DB user.
// No Firebase SDK needed.
class MockFirebaseAuthGuard {
  private ds: DataSource;

  setDataSource(ds: DataSource) {
    this.ds = ds;
  }

  async canActivate(context: any): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.headers['x-e2e-user-id'];
    if (!userId) return false;
    const [user] = await this.ds.query(
      `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    );
    if (!user) return false;
    req.user = user;
    return true;
  }
}

// ── Singleton app ──────────────────────────────────────────────────────────────
let app: INestApplication;
let mockGuard: MockFirebaseAuthGuard;

export async function createTestApp(): Promise<INestApplication> {
  if (app) return app;

  mockGuard = new MockFirebaseAuthGuard();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(FirebaseAuthGuard)
    .useValue(mockGuard)
    .compile();

  app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  // Wire the real DataSource into the mock guard
  const ds = app.get(DataSource);
  mockGuard.setDataSource(ds);

  return app;
}

export async function closeTestApp() {
  if (app) await app.close();
  app = undefined;
}

// ── Typed request helpers ──────────────────────────────────────────────────────
export function asAdmin(app: INestApplication) {
  return buildAgent(app, IDS.admin);
}
export function asJane(app: INestApplication) {
  return buildAgent(app, IDS.jane);
}
export function asJohn(app: INestApplication) {
  return buildAgent(app, IDS.john);
}

function buildAgent(app: INestApplication, userId: string) {
  const agent = request(app.getHttpServer());
  const wrap = (method: 'get' | 'post' | 'patch' | 'delete') => (url: string) =>
    agent[method](url).set('x-e2e-user-id', userId);
  return {
    get: wrap('get'),
    post: wrap('post'),
    patch: wrap('patch'),
    delete: wrap('delete'),
  };
}
