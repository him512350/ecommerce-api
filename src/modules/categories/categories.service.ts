import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import slugify from 'slugify';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const CACHE_KEY = 'categories:all';
const TTL = 30 * 60; // 30 minutes — categories rarely change

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepo: Repository<Category>,
    @Inject(CACHE_MANAGER)
    private readonly cache: any,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug || slugify(dto.name, { lower: true, strict: true });
    const exists = await this.categoriesRepo.findOne({ where: { slug } });
    if (exists) throw new ConflictException(`Slug "${slug}" already exists`);
    if (dto.parentId) await this.findOne(dto.parentId);

    const category = this.categoriesRepo.create({ ...dto, slug });
    const saved = await this.categoriesRepo.save(category);
    await this.cache.del(CACHE_KEY);
    return saved;
  }

  async findAll(): Promise<Category[]> {
    const cached = (await this.cache.get(CACHE_KEY)) as Category[];
    if (cached) return cached;

    const categories = await this.categoriesRepo.find({
      where: { isActive: true, parentId: IsNull() },
      relations: ['children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    await this.cache.set(CACHE_KEY, categories, TTL);
    return categories;
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoriesRepo.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    if (dto.name && !dto.slug) {
      dto.slug = slugify(dto.name, { lower: true, strict: true });
    }
    Object.assign(category, dto);
    const saved = await this.categoriesRepo.save(category);
    await this.cache.del(CACHE_KEY);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoriesRepo.remove(category);
    await this.cache.del(CACHE_KEY);
  }
}
