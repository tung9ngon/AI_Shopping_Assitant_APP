import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../database/order.entity';
import { OrderItem } from '../../database/order-item.entity';
import { Cart } from '../../database/cart.entity';
import { CartItem } from '../../database/cart-item.entity';
import { DiscountCode } from '../../database/discount-code.entity';
import { ProductImage } from '../../database/product-image.entity';
import { Address } from '../../database/address.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Cart,
      CartItem,
      DiscountCode,
      ProductImage,
      Address,
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}