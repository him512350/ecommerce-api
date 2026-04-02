import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import slugify from 'slugify';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { paginate } from '../../common/utils/pagination.util';

const TTL_PRODUCT = 10 * 60; // 10 minutes for single product
const TTL_LIST = 5 * 60; // 5 minutes for paginated list

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @Inject(CACHE_MANAGER)
    private readonly cache: any,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const slug = dto.slug || slugify(dto.name, { lower: true, strict: true });
    const [slugExists, skuExists] = await Promise.all([
      this.productsRepo.findOne({ where: { slug } }),
      this.productsRepo.findOne({ where: { sku: dto.sku } }),
    ]);
    if (slugExists) throw new ConflictException(`Slug "${slug}" already taken`);
    if (skuExists)
      throw new ConflictException(`SKU "${dto.sku}" already taken`);

    const product = this.productsRepo.create({ ...dto, slug });
    const saved = await this.productsRepo.save(product);

    await this.invalidateListCache();
    return saved;
  }

  async findAll(query: ProductQueryDto) {
    const cacheKey = `products:list:${JSON.stringify(query)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const qb = this.productsRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.isActive = true')
      .andWhere('product.deletedAt IS NULL');

    if (query.search) {
      qb.andWhere(
        '(product.name ILIKE :s OR product.description ILIKE :s OR product.sku ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    if (query.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.minPrice !== undefined) {
      qb.andWhere('product.basePrice >= :minPrice', {
        minPrice: query.minPrice,
      });
    }
    if (query.maxPrice !== undefined) {
      qb.andWhere('product.basePrice <= :maxPrice', {
        maxPrice: query.maxPrice,
      });
    }
    if (query.isFeatured !== undefined) {
      qb.andWhere('product.isFeatured = :isFeatured', {
        isFeatured: query.isFeatured,
      });
    }

    switch (query.sortBy) {
      case 'price_asc':
        qb.orderBy('product.basePrice', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('product.basePrice', 'DESC');
        break;
      case 'rating':
        qb.orderBy('product.averageRating', 'DESC');
        break;
      default:
        qb.orderBy('product.createdAt', 'DESC');
        break;
    }

    const result = await paginate(qb, query);
    await this.cache.set(cacheKey, result, TTL_LIST);
    return result;
  }

  async findOne(id: string): Promise<Product> {
    const cacheKey = `product:id:${id}`;
    const cached = (await this.cache.get(cacheKey)) as Product;
    if (cached) return cached;

    const product = await this.productsRepo.findOne({
      where: { id },
      relations: ['category', 'images', 'variants'],
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    await this.cache.set(cacheKey, product, TTL_PRODUCT);
    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const cacheKey = `product:slug:${slug}`;
    const cached = (await this.cache.get(cacheKey)) as Product;
    if (cached) return cached;

    const product = await this.productsRepo.findOne({
      where: { slug, isActive: true },
      relations: ['category', 'images', 'variants'],
    });
    if (!product) throw new NotFoundException(`Product "${slug}" not found`);

    await this.cache.set(cacheKey, product, TTL_PRODUCT);
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    if (dto.name && !dto.slug) {
      dto.slug = slugify(dto.name, { lower: true, strict: true });
    }
    Object.assign(product, dto);
    const saved = await this.productsRepo.save(product);

    // Invalidate all related cache keys
    await Promise.all([
      this.cache.del(`product:id:${id}`),
      this.cache.del(`product:slug:${product.slug}`),
      this.invalidateListCache(),
    ]);

    return saved;
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepo.softRemove(product);

    await Promise.all([
      this.cache.del(`product:id:${id}`),
      this.cache.del(`product:slug:${product.slug}`),
      this.invalidateListCache(),
    ]);
  }

  private async invalidateListCache(): Promise<void> {
    // cache-manager doesn't support pattern deletion natively,
    // so we use a version key — incrementing it invalidates all lists
    const version =
      (((await this.cache.get('products:list:version')) as number) ?? 0) + 1;
    await this.cache.set('products:list:version', version, 24 * 60 * 60);
  }
}
