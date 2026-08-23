import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from '../../database/order.entity';
import { OrderItem } from '../../database/order-item.entity';
import { QueryAdminOrderDto, UpdateOrderStatusDto } from './order.admin.dto';
import { PaymentCoreService } from '../../users/payment/payment-core.service';

@Injectable()
export class AdminOrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly paymentCore: PaymentCoreService,
  ) {}

  // GET /api/admin/orders
  async findAll(query: QueryAdminOrderDto) {
    const { search, status, from, to, page = 1, limit = 20 } = query;

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user');

    if (search) {
      qb.andWhere('user.full_name ILIKE :search', { search: `%${search}%` });
    }
    if (status) {
      qb.andWhere('order.status = :status', { status });
    }
    if (from) {
      qb.andWhere('order.created_at >= :from', { from: new Date(from) });
    }
    if (to) {
      qb.andWhere('order.created_at <= :to', { to: new Date(to) });
    }

    // Tổng số lượng sản phẩm trong đơn — dùng subquery thay vì leftJoin
    // để không làm nhân bản dòng (ảnh hưởng skip/take và tổng total)
    qb.addSelect((subQuery) => {
      return subQuery
        .select('COALESCE(SUM(item.quantity), 0)', 'sum')
        .from(OrderItem, 'item')
        .where('item.order_id = order.id');
    }, 'product_count');

    const total = await qb.getCount();

    qb.orderBy('order.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const { raw, entities } = await qb.getRawAndEntities();

    return {
      items: entities.map((o, index) => ({
        id: o.id,
        user_name: o.user?.full_name ?? null,
        product_count: Number(raw[index]?.product_count ?? 0),
        total: o.total,
        status: o.status,
        created_at: o.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // GET /api/admin/orders/:id
  async findOne(id: string) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: { user: true, items: { product: true }, payment: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    return {
      id: order.id,
      user: {
        id: order.user?.id,
        full_name: order.user?.full_name,
        email: order.user?.email,
        phone_number: order.user?.phone_number,
      },
      items: order.items.map((item) => ({
        product: {
          id: item.product?.id,
          name: item.product?.name,
          price: item.product?.price,
        },
        quantity: item.quantity,
      })),
      subtotal: order.subtotal,
      shipping_fee: order.shipping_fee,
      discount_amount: order.discount_amount,
      total: order.total,
      status: order.status,
      note: order.note,
      payment: order.payment ?? null,
      created_at: order.created_at,
    };
  }

  // PUT /api/admin/orders/:id/status
  //
  // Khi chuyển đơn sang 'shipped' và đơn thanh toán bằng COD còn 'pending',
  // tự động xác nhận đã thu tiền (set payment.status = 'success',
  // payment.paid_at = lúc này) trong CÙNG transaction với việc đổi order.status,
  // để tránh trường hợp đơn đã "shipped" nhưng payment vẫn treo ở "pending".
  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderRepo = queryRunner.manager.getRepository(Order);

      const order = await orderRepo.findOne({
        where: { id },
        relations: { payment: true },
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

      order.status = dto.status;
      const saved = await orderRepo.save(order);

      if (dto.status === 'shipped' && order.payment?.method === 'cod') {
        await this.paymentCore.confirmCodForOrder(order.id, queryRunner);
      }

      await queryRunner.commitTransaction();

      return {
        id: saved.id,
        status: saved.status,
        updated_at: saved.updated_at,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}