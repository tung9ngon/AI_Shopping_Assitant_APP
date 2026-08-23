import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../../database/payment.entity';
import { QueryAdminPaymentDto } from './payment.admin.dto';
import { PaymentCoreService } from '../../users/payment/payment-core.service';

@Injectable()
export class AdminPaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly paymentCore: PaymentCoreService,
  ) {}

  // GET /api/admin/payments
  async findAll(query: QueryAdminPaymentDto) {
    const { method, status, page = 1, limit = 20 } = query;

    const qb = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order');

    if (method) qb.andWhere('payment.method = :method', { method });
    if (status) qb.andWhere('payment.status = :status', { status });

    qb.orderBy('payment.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((p) => ({
        id: p.id,
        order_id: p.order_id,
        method: p.method,
        amount: p.amount,
        status: p.status,
        paid_at: p.paid_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // GET /api/admin/payments/:id
  async findOne(id: string) {
    const payment = await this.paymentRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch thanh toán');

    return {
      id: payment.id,
      order_id: payment.order_id,
      method: payment.method,
      transaction_id: payment.transaction_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      gateway_response: payment.gateway_response,
      paid_at: payment.paid_at,
    };
  }


  // POST /api/admin/payments/:id/confirm-cod
  async confirmCod(id: string) {
    const saved = await this.paymentCore.confirmCod(id);
    return {
      id: saved.id,
      status: saved.status,
      paid_at: saved.paid_at,
    };
  }
}