import { MigrationInterface, QueryRunner } from 'typeorm';

export class TierSystem1775142349147 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── tier_configs ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "tier_configs" (
        "id"                       UUID         NOT NULL DEFAULT gen_random_uuid(),
        "tier_name"                VARCHAR(40)  NOT NULL UNIQUE,
        "display_name"             VARCHAR(80)  NOT NULL,
        "priority"                 INTEGER      NOT NULL DEFAULT 0,
        "membership_duration_days" INTEGER      NOT NULL DEFAULT 365,
        "upgrade_condition_groups" JSONB        NOT NULL DEFAULT '[]',
        "renewal_condition_groups" JSONB        NOT NULL DEFAULT '[]',
        "auto_downgrade"           BOOLEAN      NOT NULL DEFAULT TRUE,
        "is_active"                BOOLEAN      NOT NULL DEFAULT TRUE,
        "created_at"               TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"               TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_tier_configs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_tier_configs_tier_name" ON "tier_configs" ("tier_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tier_configs_priority"  ON "tier_configs" ("priority")`,
    );

    // ── user_tier_memberships ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "user_tier_memberships" (
        "id"                   UUID         NOT NULL DEFAULT gen_random_uuid(),
        "user_id"              UUID         NOT NULL UNIQUE,
        "tier_name"            VARCHAR(40)  NOT NULL DEFAULT 'customer',
        "tier_config_id"       UUID,
        "started_at"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "expires_at"           TIMESTAMPTZ,
        "upgraded_by"          VARCHAR(100) NOT NULL DEFAULT 'system',
        "qualifying_order_id"  UUID,
        "created_at"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_tier_memberships" PRIMARY KEY ("id"),
        CONSTRAINT "fk_utm_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_utm_config" FOREIGN KEY ("tier_config_id")
          REFERENCES "tier_configs" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_utm_user_id"   ON "user_tier_memberships" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_utm_tier_name" ON "user_tier_memberships" ("tier_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_utm_expires"   ON "user_tier_memberships" ("expires_at")`,
    );

    // ── user_tier_histories ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "user_tier_histories" (
        "id"                   UUID         NOT NULL DEFAULT gen_random_uuid(),
        "user_id"              UUID         NOT NULL,
        "from_tier"            VARCHAR(40),
        "to_tier"              VARCHAR(40)  NOT NULL,
        "reason"               VARCHAR(60)  NOT NULL,
        "changed_by"           VARCHAR(100) NOT NULL DEFAULT 'system',
        "qualifying_order_id"  UUID,
        "meta"                 JSONB,
        "created_at"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_tier_histories" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_uth_user_id" ON "user_tier_histories" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_tier_histories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_tier_memberships"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tier_configs"`);
  }
}
