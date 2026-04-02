import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import slugify from 'slugify';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';


@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepo: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug || slugify(dto.name, { lower: true, strict: true });

    const exists = await this.categoriesRepo.findOne({ where: { slug } });
    if (exists) throw new ConflictException(`Slug "${slug}" already exists`);

    if (dto.parentId) await this.findOne(dto.parentId); // validate parent

    const category = this.categoriesRepo.create({ ...dto, slug });
    return this.categoriesRepo.save(category);
  }

  async findAll(): Promise<Category[]> {
    return this.categoriesRepo.find({
      where: { isActive: true, parentId: IsNull() }, // top-level only
      relations: ['children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Category> {
    const cat = await this.categoriesRepo.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    return cat;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    if (dto.name && !dto.slug) {
      dto.slug = slugify(dto.name, { lower: true, strict: true });
    }
    Object.assign(category, dto);
    return this.categoriesRepo.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoriesRepo.remove(category);
  }
}
