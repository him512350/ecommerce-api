import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductSearch1775142349150 implements MigrationInterface {
  // TypeORM wraps every migration in a transaction.
  // CONCURRENTLY index creation is not allowed inside a transaction,
  // so we use a plain CREATE INDEX (no CONCURRENTLY) which works fine
  // in a transaction. The only trade-off is a brief share lock on the
  // table during index creation — acceptable for a new/small table.
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Add tsvector column ────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN IF NOT EXISTS "search_vector" TSVECTOR
    `);

    // ── 2. GIN index (plain — compatible with transaction) ────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_search_vector"
        ON "products" USING gin("search_vector")
    `);

    // ── 3. Trigger function ───────────────────────────────────────────────────
    // Weights:  A — name, SKU  |  B — short_description  |  C — description
    // 'simple' dictionary works for both English and Chinese product names.
    // Change to 'english' for stemming if your store is English-only.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION products_search_vector_update()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(NEW.sku,  '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(NEW.short_description, '')), 'B') ||
          setweight(to_tsvector('simple',
            left(coalesce(NEW.description, ''), 1500)), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // ── 4. Attach trigger ─────────────────────────────────────────────────────
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS products_search_vector_trigger ON "products"
    `);
    await queryRunner.query(`
      CREATE TRIGGER products_search_vector_trigger
        BEFORE INSERT OR UPDATE OF name, sku, short_description, description
        ON "products"
        FOR EACH ROW
        EXECUTE FUNCTION products_search_vector_update()
    `);

    // ── 5. Back-fill existing rows ────────────────────────────────────────────
    await queryRunner.query(`
      UPDATE "products" SET
        search_vector =
          setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(sku,  '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(short_description, '')), 'B') ||
          setweight(to_tsvector('simple',
                      left(coalesce(description, ''), 1500)), 'C')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS products_search_vector_trigger ON "products"
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS products_search_vector_update()
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_products_search_vector"
    `);
    await queryRunner.query(`
      ALTER TABLE "products" DROP COLUMN IF EXISTS "search_vector"
    `);
  }
}
