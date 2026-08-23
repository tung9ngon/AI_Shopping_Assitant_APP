import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../database/order.entity';
import { Payment } from '../../database/payment.entity';
import { Product } from '../../database/product.entity';
import { User } from '../../database/user.entity';
import { AdminStatisticsService } from './statistics.admin.service';
import { AdminStatisticsController } from './statistics.admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Payment, Product, User])],
  controllers: [AdminStatisticsController],
  providers: [AdminStatisticsService],
})
export class AdminStatisticsModule {}