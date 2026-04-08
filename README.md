# E-Commerce API

A production-ready, Shopify-like REST API built with **NestJS**, **PostgreSQL**, and **Firebase Authentication**. Designed for Hong Kong (or any region) with full support for multi-currency, loyalty tiers, promotions, and more.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Database Migrations](#database-migrations)
- [API Documentation](#api-documentation)
- [Module Guide](#module-guide)
- [Authentication Flow](#authentication-flow)
- [Security](#security)

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | NestJS 11 (TypeScript) |
| Database | PostgreSQL 15+ via TypeORM |
| Caching | Redis (optional; falls back to in-memory) |
| Auth | Firebase Admin SDK |
| Payments | Stripe |
| File Storage | AWS S3 |
| Email | Nodemailer + Handlebars templates |
| Rate Limiting | @nestjs/throttler |
| Scheduling | @nestjs/schedule (cron jobs) |
| API Docs | Swagger / OpenAPI (dev only) |

---

## Architecture Overview

```
src/
├── common/                   # Guards, decorators, interceptors, filters, utils
│   ├── decorators/           # @CurrentUser, @Roles
│   ├── enums/                # All shared enums (roles, order status, etc.)
│   ├── guards/               # FirebaseAuthGuard, RolesGuard
│   ├── filters/              # Global HTTP exception filter
│   ├── interceptors/         # Logging + Response wrapper
│   └── utils/                # Pagination helper
├── config/                   # Typed config factories (app, db, firebase, mail, storage)
├── database/
│   ├── data-source.ts        # TypeORM DataSource for CLI migrations
│   └── migrations/           # Versioned SQL migrations (never auto-run in prod)
└── modules/
    ├── auth/                 # Firebase token verification + user auto-provisioning
    ├── users/                # User CRUD, addresses, segments
    ├── categories/           # Hierarchical product categories
    ├── products/             # Simple / Variable / Bundle products
    ├── inventory/            # Stock tracking per product/variant
    ├── cart/                 # Persistent cart with real-time pricing engine
    ├── orders/               # Order lifecycle management
    ├── payments/             # Stripe PaymentIntents + webhook handling
    ├── reviews/              # Product reviews with auto-average rating
    ├── coupons/              # Basic coupon system (% or fixed)
    ├── promotions/           # Rule-based promotion engine (automatic + coupon + gift)
    ├── tiers/                # Loyalty tier system with cron-based evaluation
    ├── points/               # Loyalty points earn/redeem
    ├── shipping/             # Zones → Methods → Rate rules
    ├── search/               # Full-text product search (PostgreSQL)
    ├── birthday/             # Birthday coupon automation
    ├── email/                # Dynamic email templates (SMTP config in DB)
    ├── mail/                 # Nodemailer service
    ├── upload/               # AWS S3 file upload
    └── health/               # Health check endpoint
```

---

## Prerequisites

- Node.js >= 20
- PostgreSQL >= 15
- Redis (optional but recommended for caching)
- Firebase project with Admin SDK credentials
- Stripe account
- AWS S3 bucket (for file uploads)

---

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/him512350/ecommerce-api.git
cd ecommerce-api

# 2. Install dependencies
npm install

# 3. Copy the environment template and fill in your values
cp .env.example .env

# 4. Run database migrations
npm run migration:run

# 5. Start the development server
npm run start:dev
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in every value. See `.env.example` for inline comments on each variable.

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | No | `development` \| `production` (default: `development`) |
| `PORT` | No | HTTP port (default: `3000`) |
| `API_PREFIX` | No | URL prefix (default: `api/v1`) |
| `FRONTEND_URL` | No | Allowed CORS origin (default: `http://localhost:3001`) |
| `DATABASE_URL` | **Yes** | Full PostgreSQL connection string |
| `REDIS_URL` | No | Redis connection string — omit to use in-memory cache |
| `FIREBASE_PROJECT_ID` | **Yes** | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | **Yes** | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | **Yes** | Firebase service account private key (use `\n` for newlines) |
| `STRIPE_SECRET_KEY` | **Yes** | Stripe secret key (`sk_live_…` or `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | Stripe webhook signing secret (`whsec_…`) |
| `PAYMENT_CURRENCY` | No | ISO 4217 currency code (default: `hkd`) |
| `TAX_RATE` | No | Decimal tax rate, e.g. `0.08` for 8% (default: `0`) |
| `STORAGE_REGION` | No | AWS region (default: `ap-southeast-1`) |
| `STORAGE_ACCESS_KEY_ID` | **Yes** | AWS access key |
| `STORAGE_SECRET_ACCESS_KEY` | **Yes** | AWS secret key |
| `STORAGE_BUCKET_NAME` | No | S3 bucket name (default: `ecommerce-media`) |
| `STORAGE_PUBLIC_URL` | No | Custom CDN / public URL prefix for uploaded files |
| `MAIL_HOST` | No | SMTP host (default: `smtp.gmail.com`) |
| `MAIL_PORT` | No | SMTP port (default: `587`) |
| `MAIL_USER` | No | SMTP username |
| `MAIL_PASSWORD` | No | SMTP password or app password |
| `MAIL_FROM_NAME` | No | Sender display name (default: `My Store`) |
| `MAIL_FROM_ADDRESS` | No | Sender email address (default: `noreply@mystore.com`) |

---

## Running the App

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

---

## Database Migrations

Migrations are **never auto-applied** (`migrationsRun: false`, `synchronize: false`). Always run them explicitly.

```bash
# Apply all pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert

# Show migration status
npm run migration:show

# Generate a new migration from entity changes
npm run migration:generate -- src/database/migrations/MyMigrationName

# Create an empty migration file
npm run migration:create -- src/database/migrations/MyMigrationName
```

---

## API Documentation

Swagger UI is available in non-production environments at:

```
http://localhost:3000/docs
```

All endpoints that require authentication use a Firebase ID token as a Bearer token:

```
Authorization: Bearer <firebase-id-token>
```

---

## Module Guide

### Auth
Firebase-based authentication. There are no username/password endpoints — identity is managed entirely by Firebase. On first login, users are automatically provisioned in the local database.

- `GET /api/v1/auth/me` — returns the current user (also triggers auto-provisioning)
- `POST /api/v1/auth/sync` — push updated profile data (name, phone) after onboarding

### Users
CRUD for user profiles and addresses. Role-based: `customer`, `admin`, `super_admin`.

### Categories
Hierarchical category tree. Each category has a slug, metadata, and optional parent.

### Products
Three product types:
- **Simple** — single SKU
- **Variable** — multiple variants (size, colour, etc.)
- **Bundle** — fixed, flexible, or stepped selection of child products

### Inventory
Stock tracking per product and variant. Admins can view low-stock alerts.

### Cart
Persistent per-user cart. On every read, the promotion engine and shipping calculator are invoked to return real-time pricing including:
- Line-item discounts from active promotions
- Applied coupon codes
- Available shipping options
- Points redemption discount
- Tax (configurable via `TAX_RATE`)

### Orders
Full lifecycle: `pending → processing → shipped → delivered → cancelled / refunded`.

### Payments
Stripe-powered. Flow:
1. `POST /api/v1/payments/create-intent` — creates a Stripe `PaymentIntent`
2. Frontend confirms with the client secret
3. Stripe calls `POST /api/v1/payments/webhook/stripe` — order status updates, tier re-evaluation, and points are awarded automatically

### Reviews
Product reviews with star ratings. The product's `averageRating` and `reviewCount` fields update automatically.

### Coupons
Simple coupon codes (percentage or fixed amount). The promotion engine is the more powerful alternative.

### Promotions (Engine)
Rule-based promotion pipeline supporting:
- **Types**: automatic (silent), coupon (code required), free gift
- **Conditions**: cart subtotal, item count, product IDs, category IDs, customer segment, first order, day of week, time of day, order count
- **Actions**: % discount, fixed discount, fixed price, free shipping, BOGO, tiered spend-band discounts, free gift injection, bonus points
- **Stacking**: `none` (exclusive), `with_same`, `all`

### Tiers
Customer loyalty tiers (Silver, Gold, Platinum, etc.). A cron job re-evaluates all users nightly. Admins can manually override.

### Points
Loyalty points system. Configurable earn/redeem rates per tier. Full transaction history.

### Shipping
Zones → Methods → Rate rules. Rate conditions include order minimum/maximum, item count, and a catch-all `always` fallback.

### Birthday
Automated birthday coupon delivery. A cron job checks for upcoming birthdays and sends personalised coupon emails.

### Email
Dynamic email templates using Handlebars. SMTP configuration is stored in the database and can be updated via admin API without a redeploy.

### Upload
AWS S3 file uploads. Single and batch image upload endpoints (admin only).

### Health
`GET /api/v1/health` — returns database and app health status via `@nestjs/terminus`.

---

## Authentication Flow

```
Client (Firebase SDK)
    │
    │  1. Sign in with Firebase (email, Google, etc.)
    │  2. Receive Firebase ID Token
    │
    ▼
E-Commerce API
    │
    │  3. Send request with: Authorization: Bearer <firebase-id-token>
    │  4. FirebaseAuthGuard verifies the token with Firebase Admin SDK
    │  5. If user not in DB → auto-create (first login)
    │  6. Attach user object to request
    │
    ▼
Controller / Service
```

---

## Security

- **Helmet** — HTTP security headers on every response
- **CORS** — restricted to `FRONTEND_URL`
- **Rate Limiting** — 10 req/s (short) and 100 req/min (long) globally
- **ValidationPipe** — strips unknown fields (`whitelist: true`) and rejects invalid ones (`forbidNonWhitelisted: true`)
- **Stripe Webhook** — verified by signature using raw request body
- **Firebase tokens** — verified server-side on every authenticated request; never trusted client-side
- **Soft deletes** — users and products are never hard-deleted; `deleted_at` is set instead
- **Password field** — `select: false` on the `password_hash` column; Firebase manages credentials

---

## License

UNLICENSED — private project.
