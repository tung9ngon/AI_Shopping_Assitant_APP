import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Order } from '../../database/order.entity';
import { Payment } from '../../database/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentCoreService } from './payment-core.service';
import { PayosWebhookController } from './payos-webhook.controller';
import { PayosProvider } from '../../config/payos';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Payment]), ConfigModule],
  controllers: [PaymentController, PayosWebhookController],
  providers: [PaymentService, PaymentCoreService, PayosProvider],
  exports: [PaymentCoreService],
})
export class PaymentModule {}