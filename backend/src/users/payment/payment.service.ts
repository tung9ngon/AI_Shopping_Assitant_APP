import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Order } from '../../database/order.entity';
import { Payment } from '../../database/payment.entity';
import { CreatePaymentDto } from './payment.dto';
import { generateProviderOrderCode } from './provider-order-code.util';
import { PAYOS_CLIENT } from '../../config/payos';
import { PayOS } from '@payos/node';
import { PaymentCoreService } from './payment-core.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly config: ConfigService,
    @Inject(PAYOS_CLIENT) private readonly payos: PayOS,
    private readonly paymentCore: PaymentCoreService,
  ) {}

  // POST /api/payments
  async create(userId: string, dto: CreatePaymentDto) {
    const order = await this.orderRepo.findOne({
      where: { id: dto.order_id, user_id: userId },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (order.status !== 'pending') {
      throw new BadRequestException(
        `Đơn hàng đang ở trạng thái "${order.status}", không thể tạo giao dịch thanh toán mới`,
      );
    }

    const existing = await this.paymentRepo.findOne({
      where: { order_id: order.id },
    });
    if (existing) {
      throw new ConflictException(
        'Đơn hàng này đã có giao dịch thanh toán, vui lòng kiểm tra trạng thái thay vì tạo mới',
      );
    }

    const payment = this.paymentRepo.create({
      order_id: order.id,
      method: dto.method,
      amount: order.total,
      currency: 'VND',
      status: 'pending',
    });
    const saved = await this.paymentRepo.save(payment);

    let payment_url: string | null = null;
    // Chuỗi VietQR để FE render mã QR ngay trong app (quét bằng app ngân hàng).
    let qr_code: string | null = null;

    if (dto.method === 'payos') {
      const providerOrderCode = generateProviderOrderCode();
      const description = `Thanh toan #${saved.id}`.slice(0, 25);

      try {
        const paymentLink = await this.payos.paymentRequests.create({
          orderCode: providerOrderCode,
          amount: Math.round(Number(order.total)),
          description,
          returnUrl: this.config.get<string>('PAYOS_RETURN_URL') ?? '',
          cancelUrl: this.config.get<string>('PAYOS_CANCEL_URL') ?? '',
        });

        payment_url = paymentLink.checkoutUrl;
        qr_code = paymentLink.qrCode ?? null;

        saved.transaction_id = String(providerOrderCode);
        saved.gateway_response = paymentLink as unknown as Record<string, any>;
        await this.paymentRepo.save(saved);
      } catch (err) {
        saved.status = 'failed';
        await this.paymentRepo.save(saved);
        throw new BadRequestException(
          `Lỗi tạo link thanh toán PayOS: ${(err as Error).message}`,
        );
      }
    }


    return {
      id: saved.id,
      order_id: saved.order_id,
      method: saved.method,
      amount: saved.amount,
      currency: saved.currency,
      status: saved.status,
      payment_url,
      qr_code,
    };
  }

  // GET /api/payments/:id/status
  async getStatus(userId: string, paymentId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
      relations: { order: true },
    });
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch thanh toán');

    if (payment.order.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem giao dịch này');
    }

    // Webhook PayOS không gọi được vào localhost, nên khi giao dịch payos còn
    // 'pending' ta CHỦ ĐỘNG hỏi PayOS trạng thái thật rồi đồng bộ vào DB.
    // Nhờ vậy FE poll GET /status sẽ tự nhận 'success' mà không cần webhook.
    if (
      payment.method === 'payos' &&
      payment.status === 'pending' &&
      payment.transaction_id
    ) {
      try {
        const info = await this.payos.paymentRequests.get(
          Number(payment.transaction_id),
        );
        if (info.status === 'PAID') {
          await this.paymentCore.markSuccess({
            transactionId: payment.transaction_id,
            gatewayResponse: info as unknown as Record<string, any>,
          });
          payment.status = 'success';
          payment.paid_at = new Date();
        } else if (['CANCELLED', 'EXPIRED', 'FAILED'].includes(info.status)) {
          await this.paymentCore.markFailed({
            transactionId: payment.transaction_id,
            gatewayResponse: info as unknown as Record<string, any>,
          });
          payment.status = 'failed';
        }
      } catch {
        // Lỗi khi hỏi PayOS -> giữ nguyên pending, lần poll sau thử lại.
      }
    }

    return {
      id: payment.id,
      status: payment.status,
      paid_at: payment.paid_at,
      transaction_id: payment.transaction_id,
    };
  }
}