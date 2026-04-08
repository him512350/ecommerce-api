import { MigrationInterface, QueryRunner } from 'typeorm';

export class BundleProduct1775142349148 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Add product_type to products ──────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN IF NOT EXISTS "product_type" VARCHAR(20) NOT NULL DEFAULT 'simple'
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_products_product_type" ON "products" ("product_type")
    `);

    // ── Add bundle_selections to cart_items ───────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "cart_items"
        ADD COLUMN IF NOT EXISTS "bundle_selections" JSONB
    `);

    // ── bundle_configs ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "bundle_configs" (
        "id"                    UUID           NOT NULL DEFAULT gen_random_uuid(),
        "product_id"            UUID           NOT NULL UNIQUE,
        "bundle_type"           VARCHAR(20)    NOT NULL DEFAULT 'fixed',
        "pricing_type"          VARCHAR(20)    NOT NULL DEFAULT 'fixed',
        "discount_percent"      NUMERIC(5,2)   NOT NULL DEFAULT 0,
        "min_total_selections"  INTEGER        NOT NULL DEFAULT 1,
        "max_total_selections"  INTEGER,
        "created_at"            TIMESTAMPTZ    NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ    NOT NULL DEFAULT now(),
        CONSTRAINT "pk_bundle_configs"  PRIMARY KEY ("id"),
        CONSTRAINT "fk_bc_product"      FOREIGN KEY ("product_id")
          REFERENCES "products" ("id") ON DELETE CASCADE
      )
    `);

    // ── bundle_groups ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "bundle_groups" (
        "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
        "bundle_config_id" UUID         NOT NULL,
        "name"             VARCHAR(120) NOT NULL,
        "description"      TEXT,
        "min_selections"   INTEGER      NOT NULL DEFAULT 1,
        "max_selections"   INTEGER,
        "is_required"      BOOLEAN      NOT NULL DEFAULT TRUE,
        "sort_order"       INTEGER      NOT NULL DEFAULT 0,
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_bundle_groups" PRIMARY KEY ("id"),
        CONSTRAINT "fk_bg_config" FOREIGN KEY ("bundle_config_id")
          REFERENCES "bundle_configs" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_bundle_groups_config_id" ON "bundle_groups" ("bundle_config_id")
    `);

    // ── bundle_group_items ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "bundle_group_items" (
        "id"             UUID           NOT NULL DEFAULT gen_random_uuid(),
        "group_id"       UUID           NOT NULL,
        "product_id"     UUID           NOT NULL,
        "variant_id"     UUID,
        "quantity"       INTEGER        NOT NULL DEFAULT 1,
        "is_default"     BOOLEAN        NOT NULL DEFAULT FALSE,
        "is_optional"    BOOLEAN        NOT NULL DEFAULT TRUE,
        "price_modifier" NUMERIC(12,2)  NOT NULL DEFAULT 0,
        "sort_order"     INTEGER        NOT NULL DEFAULT 0,
        CONSTRAINT "pk_bundle_group_items" PRIMARY KEY ("id"),
        CONSTRAINT "fk_bgi_group"   FOREIGN KEY ("group_id")
          REFERENCES "bundle_groups" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_bgi_product" FOREIGN KEY ("product_id")
          REFERENCES "products" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_bgi_variant" FOREIGN KEY ("variant_id")
          REFERENCES "product_variants" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_bgi_group_id" ON "bundle_group_items" ("group_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "bundle_group_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bundle_groups"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bundle_configs"`);
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP COLUMN IF EXISTS "bundle_selections"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_product_type"`);
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "product_type"`,
    );
  }
}
