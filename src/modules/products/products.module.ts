import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { BundleConfig } from './entities/bundle-config.entity';
import { BundleGroup } from './entities/bundle-group.entity';
import { BundleGroupItem } from './entities/bundle-group-item.entity';
import { ProductsService } from './products.service';
import { BundleService } from './bundle.service';
import { ProductsController } from './products.controller';
import { BundleController } from './bundle.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductImage,
      ProductVariant,
      BundleConfig,
      BundleGroup,
      BundleGroupItem,
    ]),
  ],
  providers: [ProductsService, BundleService],
  controllers: [ProductsController, BundleController],
  exports: [ProductsService, BundleService],
})
export class ProductsModule {}
