import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceAlert } from '../../database/price-alert.entity';
import { Product } from '../../database/product.entity';
import { ProductImage } from '../../database/product-image.entity';
import { MailModule } from '../../config/mail';
import { PriceAlertService } from './pricealert.service';
import { PriceAlertController } from './pricealert.controller ';

@Module({
  imports: [
    TypeOrmModule.forFeature([PriceAlert, Product, ProductImage]),
    MailModule,
  ],
  controllers: [PriceAlertController],
  providers: [PriceAlertService],
})
export class PriceAlertModule {}