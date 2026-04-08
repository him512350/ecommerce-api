import { MigrationInterface, QueryRunner } from 'typeorm';

export class BirthdayFeature1775142349151 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── birthday column on users ──────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "birthday" DATE
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_birthday_month_day"
        ON "users" (EXTRACT(MONTH FROM birthday), EXTRACT(DAY FROM birthday))
        WHERE birthday IS NOT NULL
    `);

    // ── birthday_coupon_config (singleton) ────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "birthday_coupon_config" (
        "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
        "is_enabled"       BOOLEAN       NOT NULL DEFAULT FALSE,
        "days_before"      INTEGER       NOT NULL DEFAULT 0,
        "coupon_type"      VARCHAR(20)   NOT NULL DEFAULT 'percentage',
        "coupon_value"     NUMERIC(10,2) NOT NULL DEFAULT 10,
        "validity_days"    INTEGER       NOT NULL DEFAULT 30,
        "min_order_amount" NUMERIC(12,2) NOT NULL DEFAULT 0,
        "email_subject"    VARCHAR(200)  NOT NULL DEFAULT 'Happy Birthday! Here is your special gift 🎂',
        "email_message"    TEXT,
        "created_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_birthday_coupon_config" PRIMARY KEY ("id")
      )
    `);

    // ── birthday_coupon_logs ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "birthday_coupon_logs" (
        "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
        "user_id"       UUID        NOT NULL,
        "year"          INTEGER     NOT NULL,
        "coupon_code"   VARCHAR(60) NOT NULL,
        "promotion_id"  UUID,
        "expires_at"    TIMESTAMPTZ NOT NULL,
        "sent_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_birthday_coupon_logs"     PRIMARY KEY ("id"),
        CONSTRAINT "uq_birthday_coupon_user_year" UNIQUE ("user_id", "year")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_birthday_coupon_logs_user_id" ON "birthday_coupon_logs" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "birthday_coupon_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "birthday_coupon_config"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_birthday_month_day"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "birthday"`);
  }
}
