import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import slugify from 'slugify';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { paginate } from '../../common/utils/pagination.util';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
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
    return this.productsRepo.save(product);
  }

  async findAll(query: ProductQueryDto) {
    const qb = this.productsRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.isActive = true')
      .andWhere('product.deletedAt IS NULL');

    if (query.search) {
      qb.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search OR product.sku ILIKE :search)',
        { search: `%${query.search}%` },
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

    return paginate(qb, query);
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepo.findOne({
      where: { id },
      relations: ['category', 'images', 'variants'],
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productsRepo.findOne({
      where: { slug, isActive: true },
      relations: ['category', 'images', 'variants'],
    });
    if (!product) throw new NotFoundException(`Product "${slug}" not found`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    if (dto.name && !dto.slug) {
      dto.slug = slugify(dto.name, { lower: true, strict: true });
    }
    Object.assign(product, dto);
    return this.productsRepo.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepo.softRemove(product);
  }
}
