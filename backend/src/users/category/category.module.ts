import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../../database/category.entity';
import { Product } from '../../database/product.entity';
import { CategoryService } from './category.service ';
import { CategoryController } from './category.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Product])],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}