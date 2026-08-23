import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../database/order.entity';
import { Payment } from '../../database/payment.entity';
import { Product } from '../../database/product.entity';
import { User } from '../../database/user.entity';
import { QueryOverviewStatsDto, QueryRevenueStatsDto } from './statistics.admin.dto';

@Injectable()
export class AdminStatisticsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // GET /api/admin/statistics/overview

  async getOverview(query: QueryOverviewStatsDto) {
    const { from, to } = query;
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const orderQb = this.orderRepo.createQueryBuilder('order');
    if (fromDate) orderQb.andWhere('order.created_at >= :from', { from: fromDate });
    if (toDate) orderQb.andWhere('order.created_at <= :to', { to: toDate });
    const totalOrders = await orderQb.getCount();


    const statusQb = this.orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status');
    if (fromDate) statusQb.andWhere('order.created_at >= :from', { from: fromDate });
    if (toDate) statusQb.andWhere('order.created_at <= :to', { to: toDate });
    const statusRaw = await statusQb.getRawMany();

    //  Doanh thu: tính trên các thanh toán đã thành công (status = 'success')
    const revenueQb = this.paymentRepo
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'revenue')
      .where('payment.status = :status', { status: 'success' });
    if (fromDate) revenueQb.andWhere('payment.paid_at >= :from', { from: fromDate });
    if (toDate) revenueQb.andWhere('payment.paid_at <= :to', { to: toDate });
    const revenueRaw = await revenueQb.getRawOne();

    // Tổng sản phẩm 
    const totalProducts = await this.productRepo.count();
    const activeProducts = await this.productRepo.count({
      where: { is_active: true },
    });

    // Tổng người dùng
    const totalUsers = await this.userRepo.count();

    return {
      total_orders: totalOrders,
      total_revenue: Number(revenueRaw?.revenue ?? 0),
      total_products: totalProducts,
      active_products: activeProducts,
      total_users: totalUsers,
      orders_by_status: statusRaw.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
    };
  }

  // GET /api/admin/statistics/revenue
  async getRevenueStats(query: QueryRevenueStatsDto) {
    const { groupBy = 'month', from, to } = query;

    const truncUnit = groupBy === 'week' ? 'week' : 'month';

    const qb = this.paymentRepo
      .createQueryBuilder('payment')
      .select(
        `TO_CHAR(DATE_TRUNC('${truncUnit}', payment.paid_at), 'YYYY-MM-DD')`,
        'period',
      )
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'revenue')
      .addSelect('COUNT(*)', 'order_count')
      .where('payment.status = :status', { status: 'success' })
      .andWhere('payment.paid_at IS NOT NULL')
      .groupBy(`DATE_TRUNC('${truncUnit}', payment.paid_at)`)
      .orderBy(`DATE_TRUNC('${truncUnit}', payment.paid_at)`, 'ASC');

    if (from) qb.andWhere('payment.paid_at >= :from', { from: new Date(from) });
    if (to) qb.andWhere('payment.paid_at <= :to', { to: new Date(to) });

    const raw = await qb.getRawMany();

    return {
      group_by: groupBy,
      items: raw.map((r) => ({
        period: r.period,
        revenue: Number(r.revenue),
        order_count: Number(r.order_count),
      })),
    };
  }
}