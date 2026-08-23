import { Body, Controller, HttpCode, Inject, Logger, Post } from '@nestjs/common';
import { PayOS } from '@payos/node';
import { PAYOS_CLIENT } from '../../config/payos';
import { PaymentCoreService } from './payment-core.service';


@Controller('webhooks/payos')
export class PayosWebhookController {
  private readonly logger = new Logger(PayosWebhookController.name);

  constructor(
    @Inject(PAYOS_CLIENT) private readonly payos: PayOS,
    private readonly paymentCore: PaymentCoreService,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(@Body() body: any) {
    const webhookData = await this.payos.webhooks.verify(body);

    const transactionId = String(webhookData.orderCode);
    const isSuccess = webhookData.code === '00';

    try {
      if (isSuccess) {
        await this.paymentCore.markSuccess({
          transactionId,
          gatewayResponse: webhookData as unknown as Record<string, any>,
        });
      } else {
        await this.paymentCore.markFailed({
          transactionId,
          gatewayResponse: webhookData as unknown as Record<string, any>,
        });
      }
    } catch (err) {
      this.logger.error(
        `Webhook PayOS lỗi cho orderCode=${transactionId}: ${(err as Error).message}`,
      );
    }

    return { success: true };
  }
}