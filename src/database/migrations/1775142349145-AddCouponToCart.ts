import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCouponToCart1775142349145 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "carts"
        ADD COLUMN IF NOT EXISTS "coupon_id"       uuid             NULL,
        ADD COLUMN IF NOT EXISTS "coupon_code"     varchar(50)      NULL,
        ADD COLUMN IF NOT EXISTS "discount_amount" numeric(12, 2)   NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE "carts"
        ADD CONSTRAINT "FK_carts_coupon_id"
        FOREIGN KEY ("coupon_id")
        REFERENCES "coupons"("id")
        ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "carts"
        DROP CONSTRAINT IF EXISTS "FK_carts_coupon_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "carts"
        DROP COLUMN IF EXISTS "coupon_id",
        DROP COLUMN IF EXISTS "coupon_code",
        DROP COLUMN IF EXISTS "discount_amount";
    `);
  }
}
