import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscountCode } from '../../database/discount-code.entity';
import { AdminDiscountCodeService } from './discountcode.admin.service';
import { AdminDiscountCodeController } from './discountcode.admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DiscountCode])],
  controllers: [AdminDiscountCodeController],
  providers: [AdminDiscountCodeService],
})
export class AdminDiscountCodeModule {}