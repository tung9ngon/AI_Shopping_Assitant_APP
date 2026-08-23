import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Order } from '../../database/order.entity';
import { Payment } from '../../database/payment.entity';


@Injectable()
export class PaymentCoreService {
  constructor(private readonly dataSource: DataSource) {}

  async markSuccess(params: {
    paymentId?: string;
    transactionId?: string;
    gatewayResponse?: Record<string, any>;
  }): Promise<Payment> {
    const { paymentId, transactionId, gatewayResponse } = params;
    if (!paymentId && !transactionId) {
      throw new BadRequestException(
        'Cần paymentId hoặc transactionId để xác nhận thanh toán',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const paymentRepo = queryRunner.manager.getRepository(Payment);
      const orderRepo = queryRunner.manager.getRepository(Order);

      const payment = await paymentRepo.findOne({
        where: paymentId ? { id: paymentId } : { transaction_id: transactionId },
      });
      if (!payment) {
        throw new NotFoundException('Không tìm thấy giao dịch thanh toán');
      }
      if (payment.status === 'success') {
        await queryRunner.commitTransaction();
        return payment;
      }

      if (payment.status !== 'pending') {
        throw new BadRequestException(
          `Giao dịch đang ở trạng thái "${payment.status}", không thể chuyển sang success`,
        );
      }

      payment.status = 'success';
      payment.paid_at = new Date();
      if (gatewayResponse) payment.gateway_response = gatewayResponse;
      await paymentRepo.save(payment);

      await orderRepo.update({ id: payment.order_id }, { status: 'paid' });

      await queryRunner.commitTransaction();
      return payment;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }


  async markFailed(params: {
    paymentId?: string;
    transactionId?: string;
    gatewayResponse?: Record<string, any>;
  }): Promise<Payment> {
    const { paymentId, transactionId, gatewayResponse } = params;
    if (!paymentId && !transactionId) {
      throw new BadRequestException(
        'Cần paymentId hoặc transactionId để đánh dấu thất bại',
      );
    }

    const paymentRepo = this.dataSource.getRepository(Payment);
    const payment = await paymentRepo.findOne({
      where: paymentId ? { id: paymentId } : { transaction_id: transactionId },
    });
    if (!payment) {
      throw new NotFoundException('Không tìm thấy giao dịch thanh toán');
    }

    if (payment.status === 'success' || payment.status === 'refunded') {
      return payment;
    }

    payment.status = 'failed';
    if (gatewayResponse) payment.gateway_response = gatewayResponse;
    return paymentRepo.save(payment);
  }

  // Dùng cho endpoint riêng POST /admin/payments/:id/confirm-cod.
  // Tự mở transaction, và set order.status = 'paid' vì đây là hành động
  // "xác nhận đã thu tiền" độc lập, không đi kèm việc đổi trạng thái giao hàng.
  async confirmCod(paymentId: string): Promise<Payment> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await this.confirmCodForOrderInternal(
        queryRunner,
        { id: paymentId },
      );

      const orderRepo = queryRunner.manager.getRepository(Order);
      await orderRepo.update({ id: payment.order_id }, { status: 'paid' });

      await queryRunner.commitTransaction();
      return payment;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // Dùng khi caller (vd. AdminOrderService.updateStatus) đã tự quản lý
  // transaction riêng và muốn set order.status thành một giá trị khác 'paid'
  // (vd. 'shipped' khi giao COD thành công). Method này CHỈ cập nhật Payment,
  // không đụng vào Order — caller chịu trách nhiệm set order.status.
  //
  // Trả về null nếu order không có payment COD đang pending (im lặng bỏ qua
  // thay vì throw, vì đây là side-effect tự động đi kèm update status đơn hàng).
  async confirmCodForOrder(
    orderId: string,
    queryRunner: QueryRunner,
  ): Promise<Payment | null> {
    const paymentRepo = queryRunner.manager.getRepository(Payment);
    const payment = await paymentRepo.findOne({ where: { order_id: orderId } });

    if (!payment || payment.method !== 'cod' || payment.status !== 'pending') {
      return null;
    }

    payment.status = 'success';
    payment.paid_at = new Date();
    return paymentRepo.save(payment);
  }

  private async confirmCodForOrderInternal(
    queryRunner: QueryRunner,
    where: { id: string },
  ): Promise<Payment> {
    const paymentRepo = queryRunner.manager.getRepository(Payment);
    const payment = await paymentRepo.findOne({ where });
    if (!payment) {
      throw new NotFoundException('Không tìm thấy giao dịch thanh toán');
    }
    if (payment.method !== 'cod') {
      throw new BadRequestException('Chỉ áp dụng xác nhận cho giao dịch COD');
    }
    if (payment.status !== 'pending') {
      throw new BadRequestException(
        `Giao dịch đang ở trạng thái "${payment.status}", không thể xác nhận thu tiền`,
      );
    }

    payment.status = 'success';
    payment.paid_at = new Date();
    return paymentRepo.save(payment);
  }
}