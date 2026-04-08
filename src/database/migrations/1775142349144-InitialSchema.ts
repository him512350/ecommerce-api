import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1775142349144 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enums ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('customer', 'admin', 'super_admin')
    `);
    await queryRunner.query(`
      CREATE TYPE "order_status_enum" AS ENUM (
        'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "payment_status_enum" AS ENUM (
        'pending', 'paid', 'failed', 'refunded', 'partially_refunded'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "payment_provider_enum" AS ENUM ('stripe')
    `);
    await queryRunner.query(`
      CREATE TYPE "payment_record_status_enum" AS ENUM (
        'pending', 'succeeded', 'failed', 'refunded'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "coupon_type_enum" AS ENUM ('percentage', 'fixed_amount')
    `);

    // ── users ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
        "firebase_uid"  VARCHAR(128) UNIQUE,
        "email"         VARCHAR(255) NOT NULL UNIQUE,
        "password_hash" TEXT,
        "first_name"    VARCHAR(100) NOT NULL DEFAULT '',
        "last_name"     VARCHAR(100) NOT NULL DEFAULT '',
        "role"          "user_role_enum" NOT NULL DEFAULT 'customer',
        "phone"         VARCHAR(20),
        "picture_url"   TEXT,
        "is_verified"   BOOLEAN NOT NULL DEFAULT FALSE,
        "is_active"     BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"    TIMESTAMPTZ,
        CONSTRAINT "pk_users" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_users_firebase_uid" ON "users" ("firebase_uid")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_email"        ON "users" ("email")`,
    );

    // ── user_addresses ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "user_addresses" (
        "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
        "user_id"      UUID NOT NULL,
        "label"        VARCHAR(50),
        "street_line1" VARCHAR(255) NOT NULL,
        "street_line2" VARCHAR(255),
        "city"         VARCHAR(100) NOT NULL,
        "state"        VARCHAR(100),
        "postal_code"  VARCHAR(20) NOT NULL,
        "country"      CHAR(2) NOT NULL,
        "phone"        VARCHAR(20),
        "is_default"   BOOLEAN NOT NULL DEFAULT FALSE,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_addresses" PRIMARY KEY ("id"),
        CONSTRAINT "fk_user_addresses_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_user_addresses_user_id" ON "user_addresses" ("user_id")`,
    );

    // ── categories ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
        "name"        VARCHAR(100) NOT NULL,
        "slug"        VARCHAR(120) NOT NULL UNIQUE,
        "description" TEXT,
        "parent_id"   UUID,
        "image_url"   TEXT,
        "is_active"   BOOLEAN NOT NULL DEFAULT TRUE,
        "sort_order"  INTEGER NOT NULL DEFAULT 0,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_categories" PRIMARY KEY ("id"),
        CONSTRAINT "fk_categories_parent" FOREIGN KEY ("parent_id")
          REFERENCES "categories" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_categories_slug" ON "categories" ("slug")`,
    );

    // ── products ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
        "name"              VARCHAR(255) NOT NULL,
        "slug"              VARCHAR(280) NOT NULL UNIQUE,
        "description"       TEXT,
        "short_description" TEXT,
        "base_price"        NUMERIC(12,2) NOT NULL,
        "compare_price"     NUMERIC(12,2),
        "sku"               VARCHAR(100) NOT NULL UNIQUE,
        "category_id"       UUID,
        "is_active"         BOOLEAN NOT NULL DEFAULT TRUE,
        "is_featured"       BOOLEAN NOT NULL DEFAULT FALSE,
        "weight"            NUMERIC(8,3),
        "average_rating"    NUMERIC(3,2) NOT NULL DEFAULT 0,
        "review_count"      INTEGER NOT NULL DEFAULT 0,
        "metadata"          JSONB,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"        TIMESTAMPTZ,
        CONSTRAINT "pk_products" PRIMARY KEY ("id"),
        CONSTRAINT "fk_products_category" FOREIGN KEY ("category_id")
          REFERENCES "categories" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_products_slug" ON "products" ("slug")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_sku"  ON "products" ("sku")`,
    );

    // ── product_images ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "product_images" (
        "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
        "product_id" UUID NOT NULL,
        "url"        TEXT NOT NULL,
        "alt_text"   TEXT,
        "position"   INTEGER NOT NULL DEFAULT 0,
        "is_primary" BOOLEAN NOT NULL DEFAULT FALSE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_product_images" PRIMARY KEY ("id"),
        CONSTRAINT "fk_product_images_product" FOREIGN KEY ("product_id")
          REFERENCES "products" ("id") ON DELETE CASCADE
      )
    `);

    // ── product_variants ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "product_variants" (
        "id"                 UUID NOT NULL DEFAULT gen_random_uuid(),
        "product_id"         UUID NOT NULL,
        "name"               VARCHAR(200) NOT NULL,
        "sku"                VARCHAR(100) NOT NULL UNIQUE,
        "price"              NUMERIC(12,2) NOT NULL,
        "compare_price"      NUMERIC(12,2),
        "inventory_quantity" INTEGER NOT NULL DEFAULT 0,
        "options"            JSONB,
        "is_active"          BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_product_variants" PRIMARY KEY ("id"),
        CONSTRAINT "fk_product_variants_product" FOREIGN KEY ("product_id")
          REFERENCES "products" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_product_variants_sku" ON "product_variants" ("sku")`,
    );

    // ── inventory ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "inventory" (
        "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
        "product_id"          UUID NOT NULL,
        "variant_id"          UUID,
        "quantity"            INTEGER NOT NULL DEFAULT 0,
        "reserved_quantity"   INTEGER NOT NULL DEFAULT 0,
        "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
        "warehouse_location"  VARCHAR(100),
        "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_inventory" PRIMARY KEY ("id"),
        CONSTRAINT "fk_inventory_product" FOREIGN KEY ("product_id")
          REFERENCES "products" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_inventory_variant" FOREIGN KEY ("variant_id")
          REFERENCES "product_variants" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_inventory_product_id" ON "inventory" ("product_id")`,
    );

    // ── coupons ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "coupons" (
        "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
        "code"             VARCHAR(50) NOT NULL UNIQUE,
        "type"             "coupon_type_enum" NOT NULL,
        "value"            NUMERIC(10,2) NOT NULL,
        "min_order_amount" NUMERIC(12,2) NOT NULL DEFAULT 0,
        "max_uses"         INTEGER,
        "used_count"       INTEGER NOT NULL DEFAULT 0,
        "starts_at"        TIMESTAMPTZ,
        "expires_at"       TIMESTAMPTZ,
        "is_active"        BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_coupons" PRIMARY KEY ("id")
      )
    `);

    // ── carts ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "carts" (
        "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
        "user_id"    UUID,
        "session_id" VARCHAR(100),
        "expires_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_carts" PRIMARY KEY ("id"),
        CONSTRAINT "fk_carts_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_carts_user_id" ON "carts" ("user_id")`,
    );

    // ── cart_items ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "cart_items" (
        "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
        "cart_id"    UUID NOT NULL,
        "product_id" UUID NOT NULL,
        "variant_id" UUID,
        "quantity"   INTEGER NOT NULL DEFAULT 1,
        "unit_price" NUMERIC(12,2) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_cart_items" PRIMARY KEY ("id"),
        CONSTRAINT "fk_cart_items_cart" FOREIGN KEY ("cart_id")
          REFERENCES "carts" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_cart_items_product" FOREIGN KEY ("product_id")
          REFERENCES "products" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_cart_items_variant" FOREIGN KEY ("variant_id")
          REFERENCES "product_variants" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_cart_items_cart_id" ON "cart_items" ("cart_id")`,
    );

    // ── orders ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
        "order_number"        VARCHAR(20) NOT NULL UNIQUE,
        "user_id"             UUID NOT NULL,
        "status"              "order_status_enum" NOT NULL DEFAULT 'pending',
        "payment_status"      "payment_status_enum" NOT NULL DEFAULT 'pending',
        "subtotal"            NUMERIC(12,2) NOT NULL,
        "tax_amount"          NUMERIC(12,2) NOT NULL DEFAULT 0,
        "shipping_cost"       NUMERIC(12,2) NOT NULL DEFAULT 0,
        "discount_amount"     NUMERIC(12,2) NOT NULL DEFAULT 0,
        "total"               NUMERIC(12,2) NOT NULL,
        "shipping_address_id" UUID,
        "coupon_id"           UUID,
        "payment_intent_id"   VARCHAR(100),
        "notes"               TEXT,
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_orders" PRIMARY KEY ("id"),
        CONSTRAINT "fk_orders_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_orders_address" FOREIGN KEY ("shipping_address_id")
          REFERENCES "user_addresses" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_orders_coupon" FOREIGN KEY ("coupon_id")
          REFERENCES "coupons" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_orders_user_id"      ON "orders" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_order_number" ON "orders" ("order_number")`,
    );

    // ── order_items ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
        "order_id"         UUID NOT NULL,
        "product_id"       UUID NOT NULL,
        "variant_id"       UUID,
        "quantity"         INTEGER NOT NULL DEFAULT 1,
        "unit_price"       NUMERIC(12,2) NOT NULL,
        "total_price"      NUMERIC(12,2) NOT NULL,
        "product_name"     VARCHAR(255) NOT NULL,
        "product_snapshot" JSONB,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_order_items" PRIMARY KEY ("id"),
        CONSTRAINT "fk_order_items_order" FOREIGN KEY ("order_id")
          REFERENCES "orders" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_order_items_product" FOREIGN KEY ("product_id")
          REFERENCES "products" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_order_items_variant" FOREIGN KEY ("variant_id")
          REFERENCES "product_variants" ("id") ON DELETE SET NULL
      )
    `);

    // ── payments ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
        "order_id"       UUID NOT NULL UNIQUE,
        "amount"         NUMERIC(12,2) NOT NULL,
        "currency"       CHAR(3) NOT NULL DEFAULT 'HKD',
        "status"         "payment_record_status_enum" NOT NULL DEFAULT 'pending',
        "provider"       "payment_provider_enum" NOT NULL DEFAULT 'stripe',
        "transaction_id" VARCHAR(100) UNIQUE,
        "payment_method" VARCHAR(50),
        "metadata"       JSONB,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_payments" PRIMARY KEY ("id"),
        CONSTRAINT "fk_payments_order" FOREIGN KEY ("order_id")
          REFERENCES "orders" ("id") ON DELETE CASCADE
      )
    `);

    // ── reviews ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
        "product_id"  UUID NOT NULL,
        "user_id"     UUID NOT NULL,
        "rating"      SMALLINT NOT NULL,
        "title"       VARCHAR(200),
        "body"        TEXT,
        "is_verified" BOOLEAN NOT NULL DEFAULT FALSE,
        "is_approved" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "uq_reviews_product_user" UNIQUE ("product_id", "user_id"),
        CONSTRAINT "fk_reviews_product" FOREIGN KEY ("product_id")
          REFERENCES "products" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_reviews_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_reviews_product_id" ON "reviews" ("product_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cart_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "carts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coupons"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_variants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_images"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_addresses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "coupon_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_record_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_provider_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "order_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}
