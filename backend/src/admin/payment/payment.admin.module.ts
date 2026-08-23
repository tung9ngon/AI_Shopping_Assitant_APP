import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../../database/payment.entity';
import { AdminPaymentService } from './payment.admin.service';
import { AdminPaymentController } from './payment.admin.controller';
import { PaymentModule } from '../../users/payment/payment.module';

@Module({
 
  imports: [TypeOrmModule.forFeature([Payment]), PaymentModule],
  controllers: [AdminPaymentController],
  providers: [AdminPaymentService],
})
export class AdminPaymentModule {}