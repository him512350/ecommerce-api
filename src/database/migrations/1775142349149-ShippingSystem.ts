import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShippingSystem1775142349149 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── shipping_zones ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "shipping_zones" (
        "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
        "name"        VARCHAR(120) NOT NULL,
        "description" TEXT,
        "countries"   JSONB        NOT NULL DEFAULT '[]',
        "sort_order"  INTEGER      NOT NULL DEFAULT 0,
        "is_active"   BOOLEAN      NOT NULL DEFAULT TRUE,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_shipping_zones" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_shipping_zones_is_active" ON "shipping_zones" ("is_active")
    `);

    // ── shipping_methods ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "shipping_methods" (
        "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
        "zone_id"        UUID         NOT NULL,
        "name"           VARCHAR(120) NOT NULL,
        "description"    TEXT,
        "estimated_days" VARCHAR(80),
        "is_active"      BOOLEAN      NOT NULL DEFAULT TRUE,
        "sort_order"     INTEGER      NOT NULL DEFAULT 0,
        "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_shipping_methods" PRIMARY KEY ("id"),
        CONSTRAINT "fk_sm_zone" FOREIGN KEY ("zone_id")
          REFERENCES "shipping_zones" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_shipping_methods_zone_id"   ON "shipping_methods" ("zone_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_shipping_methods_is_active" ON "shipping_methods" ("is_active")
    `);

    // ── shipping_rates ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "shipping_rates" (
        "id"             UUID          NOT NULL DEFAULT gen_random_uuid(),
        "method_id"      UUID          NOT NULL,
        "condition_type" VARCHAR(30)   NOT NULL DEFAULT 'always',
        "condition_min"  NUMERIC(12,2),
        "condition_max"  NUMERIC(12,2),
        "rate_type"      VARCHAR(20)   NOT NULL DEFAULT 'fixed',
        "cost"           NUMERIC(12,2) NOT NULL DEFAULT 0,
        "sort_order"     INTEGER       NOT NULL DEFAULT 0,
        CONSTRAINT "pk_shipping_rates" PRIMARY KEY ("id"),
        CONSTRAINT "fk_sr_method" FOREIGN KEY ("method_id")
          REFERENCES "shipping_methods" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_shipping_rates_method_id" ON "shipping_rates" ("method_id")
    `);

    // ── Add selected_shipping_method_id to carts ──────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "carts"
        ADD COLUMN IF NOT EXISTS "selected_shipping_method_id" UUID
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "carts" DROP COLUMN IF EXISTS "selected_shipping_method_id"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "shipping_rates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shipping_methods"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shipping_zones"`);
  }
}
