import { MigrationInterface, QueryRunner } from 'typeorm';

export class PointsSystem1775142349152 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── points_config (singleton) ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "points_config" (
        "id"                    UUID          NOT NULL DEFAULT gen_random_uuid(),
        "is_enabled"            BOOLEAN       NOT NULL DEFAULT FALSE,
        "expiry_days"           INTEGER       NOT NULL DEFAULT 365,
        "min_points_to_redeem"  INTEGER       NOT NULL DEFAULT 100,
        "max_redemption_percent" NUMERIC(5,2) NOT NULL DEFAULT 50,
        "created_at"            TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_points_config" PRIMARY KEY ("id")
      )
    `);

    // ── points_role_configs ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "points_role_configs" (
        "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
        "tier_name"        VARCHAR(40)   NOT NULL UNIQUE,
        "earn_rate"        NUMERIC(8,4)  NOT NULL DEFAULT 1,
        "redemption_rate"  NUMERIC(10,4) NOT NULL DEFAULT 100,
        "created_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_points_role_configs" PRIMARY KEY ("id")
      )
    `);

    // Seed default role configs
    await queryRunner.query(`
      INSERT INTO "points_role_configs" ("tier_name", "earn_rate", "redemption_rate")
      VALUES
        ('customer',    1,   100),
        ('vip',         1.5,  80),
        ('special_vip', 2,    60)
    `);

    // ── user_points (wallet per user) ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "user_points" (
        "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
        "user_id"          UUID        NOT NULL UNIQUE,
        "balance"          INTEGER     NOT NULL DEFAULT 0,
        "lifetime_earned"  INTEGER     NOT NULL DEFAULT 0,
        "lifetime_redeemed" INTEGER    NOT NULL DEFAULT 0,
        "lifetime_expired" INTEGER     NOT NULL DEFAULT 0,
        "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_points" PRIMARY KEY ("id"),
        CONSTRAINT "fk_up_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_user_points_user_id" ON "user_points" ("user_id")
    `);

    // ── points_transactions (ledger) ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "points_transactions" (
        "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
        "user_id"        UUID        NOT NULL,
        "points"         INTEGER     NOT NULL,
        "balance_after"  INTEGER     NOT NULL,
        "type"           VARCHAR(30) NOT NULL,
        "reference_type" VARCHAR(20),
        "reference_id"   UUID,
        "description"    VARCHAR(255),
        "expires_at"     TIMESTAMPTZ,
        "is_expired"     BOOLEAN     NOT NULL DEFAULT FALSE,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_points_transactions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_pt_user_id"    ON "points_transactions" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_pt_type"       ON "points_transactions" ("type")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_pt_expires_at" ON "points_transactions" ("expires_at")
        WHERE expires_at IS NOT NULL AND is_expired = FALSE
    `);

    // ── redeemed_points on carts ──────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "carts"
        ADD COLUMN IF NOT EXISTS "redeemed_points" INTEGER
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "carts" DROP COLUMN IF EXISTS "redeemed_points"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "points_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_points"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "points_role_configs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "points_config"`);
  }
}
