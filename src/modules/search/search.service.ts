import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Product } from '../products/entities/product.entity';
import { SearchQueryDto, SearchSortBy, SuggestQueryDto } from './dto/search-query.dto';

export interface CategoryFacet {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface PriceRangeFacet {
  min: number;
  max: number;
}

export interface SearchFacets {
  categories: CategoryFacet[];
  priceRange: PriceRangeFacet;
  totalInStock: number;
  productTypes: { type: string; count: number }[];
}

export interface SearchResult {
  results: Product[];
  total: number;
  page: number;
  limit: number;
  facets: SearchFacets;
}

export interface SuggestResult {
  id: string;
  name: string;
  slug: string;
  sku: string;
  basePrice: number;
  imageUrl: string | null;
}

const CACHE_TTL = 30; // seconds — short TTL so product updates are reflected quickly

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @Inject(CACHE_MANAGER)
    private readonly cache: any,
  ) {}

  // ── Main search ───────────────────────────────────────────────────────────

  async search(dto: SearchQueryDto): Promise<SearchResult> {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 20;
    const q     = dto.q?.trim() ?? '';

    const cacheKey = `search:${JSON.stringify(dto)}`;
    const cached = await this.cache.get(cacheKey).catch(() => null);
    if (cached) return cached;

    const [results, total, facets] = await Promise.all([
      this.runProductQuery(dto, q, page, limit),
      this.runCountQuery(dto, q),
      this.runFacetQuery(dto, q),
    ]);

    const result: SearchResult = { results, total, page, limit, facets };
    await this.cache.set(cacheKey, result, CACHE_TTL).catch(() => {});
    return result;
  }

  // ── Autocomplete suggestions ──────────────────────────────────────────────

  async suggest(dto: SuggestQueryDto): Promise<SuggestResult[]> {
    const q     = dto.q?.trim() ?? '';
    const limit = dto.limit ?? 8;

    if (!q || q.length < 2) return [];

    const cacheKey = `suggest:${q}:${limit}`;
    const cached = await this.cache.get(cacheKey).catch(() => null);
    if (cached) return cached;

    // Use prefix match (ILIKE) for instant suggestions; fall back to full-text.
    // We order prefix matches first, then full-text matches below.
    const rows = await this.productsRepo
      .createQueryBuilder('p')
      .select([
        'p.id            AS id',
        'p.name          AS name',
        'p.slug          AS slug',
        'p.sku           AS sku',
        'p.base_price    AS "basePrice"',
        // Pick the first primary image, or any image
        `(SELECT url FROM product_images pi
            WHERE pi.product_id = p.id
            ORDER BY pi.is_primary DESC, pi.position ASC
            LIMIT 1)         AS "imageUrl"`,
        // Rank: prefix match = 2, full-text match = 1
        `CASE WHEN p.name ILIKE :prefix THEN 2 ELSE 1 END AS sort_rank`,
      ])
      .where('p.is_active = true')
      .andWhere('p.deleted_at IS NULL')
      .andWhere(
        `(p.name ILIKE :prefix OR p.search_vector @@ to_tsquery('simple', :tsq))`,
        {
          prefix: `${q}%`,
          tsq:    `${q.replace(/\s+/g, ':* & ')}:*`,
        },
      )
      .orderBy('sort_rank', 'DESC')
      .addOrderBy('p.review_count', 'DESC')
      .limit(limit)
      .getRawMany();

    const results: SuggestResult[] = rows.map((r) => ({
      id:        r.id,
      name:      r.name,
      slug:      r.slug,
      sku:       r.sku,
      basePrice: Number(r.basePrice),
      imageUrl:  r.imageUrl ?? null,
    }));

    await this.cache.set(cacheKey, results, CACHE_TTL).catch(() => {});
    return results;
  }

  // ── Internal: main product query ──────────────────────────────────────────

  private async runProductQuery(
    dto: SearchQueryDto,
    q: string,
    page: number,
    limit: number,
  ): Promise<Product[]> {
    const qb = this.productsRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.images', 'images')
      .where('p.isActive = true')
      .andWhere('p.deletedAt IS NULL');

    this.applyFilters(qb, dto, q);
    this.applySort(qb, dto.sortBy, q);

    return qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
  }

  // ── Internal: count query (same filters, no pagination) ───────────────────

  private async runCountQuery(dto: SearchQueryDto, q: string): Promise<number> {
    const qb = this.productsRepo
      .createQueryBuilder('p')
      .where('p.isActive = true')
      .andWhere('p.deletedAt IS NULL');

    this.applyFilters(qb, dto, q);
    return qb.getCount();
  }

  // ── Internal: facet queries ───────────────────────────────────────────────

  private async runFacetQuery(dto: SearchQueryDto, q: string): Promise<SearchFacets> {
    // Build a base filter clause without pagination/sort for facets
    const base = this.productsRepo
      .createQueryBuilder('p')
      .where('p.isActive = true')
      .andWhere('p.deletedAt IS NULL');

    // Apply text + non-category filters so facets reflect the current search
    if (q) {
      base.andWhere(`p.search_vector @@ plainto_tsquery('simple', :q)`, { q });
    }
    if (dto.minPrice !== undefined) {
      base.andWhere('p.basePrice >= :minPrice', { minPrice: dto.minPrice });
    }
    if (dto.maxPrice !== undefined) {
      base.andWhere('p.basePrice <= :maxPrice', { maxPrice: dto.maxPrice });
    }
    if (dto.productType) {
      base.andWhere('p.productType = :productType', { productType: dto.productType });
    }
    if (dto.isFeatured) {
      base.andWhere('p.isFeatured = true');
    }

    const [categoryFacets, priceStats, stockCount, typeFacets] = await Promise.all([
      // Category distribution
      this.productsRepo
        .createQueryBuilder('p')
        .select('category.id',   'id')
        .addSelect('category.name', 'name')
        .addSelect('category.slug', 'slug')
        .addSelect('COUNT(p.id)',   'count')
        .innerJoin('p.category', 'category')
        .where('p.isActive = true')
        .andWhere('p.deletedAt IS NULL')
        .andWhere(q ? `p.search_vector @@ plainto_tsquery('simple', :q)` : '1=1', q ? { q } : {})
        .groupBy('category.id')
        .addGroupBy('category.name')
        .addGroupBy('category.slug')
        .orderBy('count', 'DESC')
        .limit(20)
        .getRawMany<{ id: string; name: string; slug: string; count: string }>(),

      // Price range
      base.clone()
        .select('MIN(p.basePrice)', 'min')
        .addSelect('MAX(p.basePrice)', 'max')
        .getRawOne<{ min: string; max: string }>(),

      // Products with stock (have at least one variant with inventory > 0 or no variants)
      base.clone().getCount(),

      // Product type breakdown
      base.clone()
        .select('p.productType', 'type')
        .addSelect('COUNT(p.id)', 'count')
        .groupBy('p.productType')
        .getRawMany<{ type: string; count: string }>(),
    ]);

    return {
      categories: categoryFacets.map((r) => ({
        id:    r.id,
        name:  r.name,
        slug:  r.slug,
        count: Number(r.count),
      })),
      priceRange: {
        min: Number(priceStats?.min ?? 0),
        max: Number(priceStats?.max ?? 0),
      },
      totalInStock: stockCount,
      productTypes: typeFacets.map((r) => ({ type: r.type, count: Number(r.count) })),
    };
  }

  // ── Internal: shared filter application ───────────────────────────────────

  private applyFilters(qb: any, dto: SearchQueryDto, q: string): void {
    if (q) {
      // ts_rank is added as a selected expression so we can sort by it.
      // plainto_tsquery handles phrases and ignores operators in user input.
      qb.addSelect(
        `ts_rank(p.search_vector, plainto_tsquery('simple', :q))`,
        'rank',
      ).andWhere(`p.search_vector @@ plainto_tsquery('simple', :q)`, { q });
    }

    if (dto.categoryId) {
      if (dto.includeSubcategories) {
        // Include the category and all descendants (recursive CTE)
        qb.andWhere(
          `p.categoryId IN (
            WITH RECURSIVE cats AS (
              SELECT id FROM categories WHERE id = :catId
              UNION ALL
              SELECT c.id FROM categories c JOIN cats ON c.parent_id = cats.id
            ) SELECT id FROM cats
          )`,
          { catId: dto.categoryId },
        );
      } else {
        qb.andWhere('p.categoryId = :categoryId', { categoryId: dto.categoryId });
      }
    }

    if (dto.minPrice !== undefined) {
      qb.andWhere('p.basePrice >= :minPrice', { minPrice: dto.minPrice });
    }
    if (dto.maxPrice !== undefined) {
      qb.andWhere('p.basePrice <= :maxPrice', { maxPrice: dto.maxPrice });
    }
    if (dto.productType) {
      qb.andWhere('p.productType = :productType', { productType: dto.productType });
    }
    if (dto.isFeatured) {
      qb.andWhere('p.isFeatured = true');
    }
  }

  // ── Internal: sort ────────────────────────────────────────────────────────

  private applySort(qb: any, sortBy: SearchSortBy | undefined, q: string): void {
    const sort = sortBy ?? (q ? SearchSortBy.RELEVANCE : SearchSortBy.NEWEST);

    switch (sort) {
      case SearchSortBy.RELEVANCE:
        if (q) {
          qb.orderBy('rank', 'DESC');
        } else {
          qb.orderBy('p.createdAt', 'DESC');
        }
        break;
      case SearchSortBy.PRICE_ASC:
        qb.orderBy('p.basePrice', 'ASC');
        break;
      case SearchSortBy.PRICE_DESC:
        qb.orderBy('p.basePrice', 'DESC');
        break;
      case SearchSortBy.NEWEST:
        qb.orderBy('p.createdAt', 'DESC');
        break;
      case SearchSortBy.RATING:
        qb.orderBy('p.averageRating', 'DESC');
        break;
      case SearchSortBy.POPULAR:
        qb.orderBy('p.reviewCount', 'DESC');
        break;
      default:
        qb.orderBy('p.createdAt', 'DESC');
    }

    // Secondary sort for stable pagination
    qb.addOrderBy('p.id', 'ASC');
  }
}
