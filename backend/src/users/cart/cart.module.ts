import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from '../../database/cart.entity';
import { CartItem } from '../../database/cart-item.entity';
import { Product } from '../../database/product.entity';
import { ProductImage } from '../../database/product-image.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller ';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem, Product, ProductImage]),
  ],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}