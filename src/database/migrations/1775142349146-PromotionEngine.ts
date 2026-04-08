import { MigrationInterface, QueryRunner } from 'typeorm';

export class PromotionEngine1775142349146 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enums ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "promotion_type_enum" AS ENUM ('coupon', 'automatic', 'free_gift')
    `);
    await queryRunner.query(`
      CREATE TYPE "stackable_mode_enum" AS ENUM ('none', 'with_same', 'all')
    `);
    await queryRunner.query(`
      CREATE TYPE "group_operator_enum" AS ENUM ('AND', 'OR')
    `);
    await queryRunner.query(`
      CREATE TYPE "condition_type_enum" AS ENUM (
        'cart_subtotal', 'cart_quantity', 'cart_item_count',
        'product_ids', 'category_ids', 'customer_segment',
        'first_order_only', 'day_of_week', 'time_of_day', 'min_order_count'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "comparison_operator_enum" AS ENUM ('gte', 'lte', 'eq', 'in', 'not_in')
    `);
    await queryRunner.query(`
      CREATE TYPE "action_type_enum" AS ENUM (
        'percentage_discount', 'fixed_discount', 'fixed_price',
        'free_shipping', 'bogo', 'tiered_discount', 'free_gift', 'bonus_points'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "action_target_enum" AS ENUM (
        'order', 'cheapest_item', 'most_expensive',
        'specific_products', 'category', 'shipping'
      )
    `);

    // ── promotions ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "promotions" (
        "id"                      UUID         NOT NULL DEFAULT gen_random_uuid(),
        "name"                    VARCHAR(120) NOT NULL,
        "description"             TEXT,
        "type"                    "promotion_type_enum"  NOT NULL,
        "code"                    VARCHAR(60)  UNIQUE,
        "priority"                INTEGER      NOT NULL DEFAULT 0,
        "stackable"               "stackable_mode_enum"  NOT NULL DEFAULT 'none',
        "is_active"               BOOLEAN      NOT NULL DEFAULT TRUE,
        "starts_at"               TIMESTAMPTZ,
        "expires_at"              TIMESTAMPTZ,
        "max_uses"                INTEGER,
        "used_count"              INTEGER      NOT NULL DEFAULT 0,
        "max_uses_per_customer"   INTEGER,
        "created_at"              TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"              TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_promotions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_promotions_code"      ON "promotions" ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_promotions_type"      ON "promotions" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_promotions_is_active" ON "promotions" ("is_active")`,
    );

    // ── promotion_condition_groups ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "promotion_condition_groups" (
        "id"           UUID    NOT NULL DEFAULT gen_random_uuid(),
        "promotion_id" UUID    NOT NULL,
        "operator"     "group_operator_enum" NOT NULL DEFAULT 'AND',
        "sort_order"   INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "pk_promotion_condition_groups" PRIMARY KEY ("id"),
        CONSTRAINT "fk_pcg_promotion" FOREIGN KEY ("promotion_id")
          REFERENCES "promotions" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_pcg_promotion_id" ON "promotion_condition_groups" ("promotion_id")
    `);

    // ── promotion_conditions ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "promotion_conditions" (
        "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
        "group_id"  UUID NOT NULL,
        "type"      "condition_type_enum"    NOT NULL,
        "operator"  "comparison_operator_enum" NOT NULL,
        "value"     JSONB NOT NULL,
        CONSTRAINT "pk_promotion_conditions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_pc_group" FOREIGN KEY ("group_id")
          REFERENCES "promotion_condition_groups" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_pc_group_id" ON "promotion_conditions" ("group_id")
    `);

    // ── promotion_actions ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "promotion_actions" (
        "id"           UUID             NOT NULL DEFAULT gen_random_uuid(),
        "promotion_id" UUID             NOT NULL,
        "type"         "action_type_enum"   NOT NULL,
        "value"        NUMERIC(12,2),
        "target"       "action_target_enum" NOT NULL DEFAULT 'order',
        "config"       JSONB,
        "sort_order"   INTEGER          NOT NULL DEFAULT 0,
        CONSTRAINT "pk_promotion_actions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_pa_promotion" FOREIGN KEY ("promotion_id")
          REFERENCES "promotions" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_pa_promotion_id" ON "promotion_actions" ("promotion_id")
    `);

    // ── promotion_usage_logs ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "promotion_usage_logs" (
        "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
        "promotion_id"    UUID         NOT NULL,
        "user_id"         UUID         NOT NULL,
        "order_id"        UUID,
        "discount_amount" NUMERIC(12,2) NOT NULL,
        "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_promotion_usage_logs" PRIMARY KEY ("id"),
        CONSTRAINT "fk_pul_promotion" FOREIGN KEY ("promotion_id")
          REFERENCES "promotions" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_pul_promotion_id" ON "promotion_usage_logs" ("promotion_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pul_user_id"      ON "promotion_usage_logs" ("user_id")`,
    );

    // ── user_segments ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "user_segments" (
        "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
        "user_id"    UUID        NOT NULL,
        "segment"    VARCHAR(80) NOT NULL,
        "expires_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_segments"            PRIMARY KEY ("id"),
        CONSTRAINT "uq_user_segments_user_seg"   UNIQUE ("user_id", "segment"),
        CONSTRAINT "fk_user_segments_user"       FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_user_segments_user_id" ON "user_segments" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_segments_segment" ON "user_segments" ("segment")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_segments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promotion_usage_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promotion_actions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promotion_conditions"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "promotion_condition_groups"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "promotions"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "action_target_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "action_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "comparison_operator_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "condition_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "group_operator_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "stackable_mode_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "promotion_type_enum"`);
  }
}
