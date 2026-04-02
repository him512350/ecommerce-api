import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Product } from '../products/entities/product.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '../../common/utils/pagination.util';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepo: Repository<Review>,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    const existing = await this.reviewsRepo.findOne({
      where: { productId: dto.productId, userId },
    });
    if (existing)
      throw new BadRequestException('You have already reviewed this product');

    return this.dataSource.transaction(async (manager) => {
      const review = manager.create(Review, { ...dto, userId });
      const saved = await manager.save(review);

      // Recalculate product rating
      const { avg, count } = await manager
        .createQueryBuilder(Review, 'r')
        .select('AVG(r.rating)', 'avg')
        .addSelect('COUNT(*)', 'count')
        .where('r.productId = :pid AND r.isApproved = true', {
          pid: dto.productId,
        })
        .getRawOne();

      await manager.update(Product, dto.productId, {
        averageRating: parseFloat(parseFloat(avg).toFixed(2)),
        reviewCount: parseInt(count),
      });

      return saved;
    });
  }

  async findByProduct(productId: string, pagination: PaginationDto) {
    const qb = this.reviewsRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .where('review.productId = :productId', { productId })
      .andWhere('review.isApproved = true')
      .orderBy('review.createdAt', 'DESC');

    return paginate(qb, pagination);
  }

  async remove(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const review = await this.reviewsRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (!isAdmin && review.userId !== userId) {
      throw new BadRequestException('You can only delete your own reviews');
    }
    await this.reviewsRepo.remove(review);
  }
}
