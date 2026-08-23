import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../database/product.entity';
import { ProductImage } from '../../database/product-image.entity';
import { ProductSpec } from '../../database/product-spec.entity';
import { ProductReview } from '../../database/product-review.entity';
import { Tag } from '../../database/tag.entity';
import { AdminProductService } from './product.admin.service';
import { AdminProductController } from './product.admin.controller';
import { CloudinaryModule } from '../../cloudinary/Cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, ProductSpec, ProductReview, Tag]),
    CloudinaryModule,
  ],
  controllers: [AdminProductController],
  providers: [AdminProductService],
})
export class AdminProductModule { }