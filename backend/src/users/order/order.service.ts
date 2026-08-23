import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Order, OrderStatus } from '../../database/order.entity';
import { OrderItem } from '../../database/order-item.entity';
import { Cart } from '../../database/cart.entity';
import { CartItem } from '../../database/cart-item.entity';
import { DiscountCode, DiscountType } from '../../database/discount-code.entity';
import { ProductImage } from '../../database/product-image.entity';
import { Address } from '../../database/address.entity';
import { CreateOrderDto, QueryOrderDto } from './order.dto';

const SHIPPING_FEE = 30_000;
const FREE_SHIPPING_THRESHOLD = 500_000;
const CANCELABLE_STATUSES: OrderStatus[] = ['pending', 'simulated_success'];

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private async validateDiscountCode(
    discountRepo: Repository<DiscountCode>,
    code: string,
    subtotal: number,
    expectedCategory: 'order' | 'free_shipping',
  ): Promise<DiscountCode> {
    const discount = await discountRepo.findOne({ where: { code } });
    if (!discount)
      throw new BadRequestException(`Mã "${code}" không tồn tại`);

    const category = discount.category ?? 'order';
    if (category !== expectedCategory) {
      throw new BadRequestException(
        expectedCategory === 'free_shipping'
          ? `Mã "${code}" không phải mã miễn phí ship, vui lòng nhập vào trường discount_code`
          : `Mã "${code}" là mã miễn phí ship, vui lòng nhập vào trường freeship_code`,
      );
    }

    const now = new Date();
    if (!discount.is_active)
      throw new BadRequestException(`Mã "${code}" đã bị vô hiệu hoá`);
    if (discount.valid_until && now > new Date(discount.valid_until))
      throw new BadRequestException(`Mã "${code}" đã hết hạn`);
    if (discount.valid_from && now < new Date(discount.valid_from))
      throw new BadRequestException(`Mã "${code}" chưa có hiệu lực`);
    if (
      discount.usage_limit !== null &&
      discount.used_count >= discount.usage_limit
    )
      throw new BadRequestException(`Mã "${code}" đã hết lượt sử dụng`);
    if (
      discount.min_order_value !== null &&
      subtotal < Number(discount.min_order_value)
    ) {
      throw new BadRequestException(
        `Đơn hàng tối thiểu ${Number(discount.min_order_value).toLocaleString('vi-VN')}đ để áp dụng mã "${code}"`,
      );
    }

    return discount;
  }

  // POST /api/orders - checkout từ giỏ hàng hiện tại
  async checkout(userId: string, dto: CreateOrderDto) {
    return this.dataSource.transaction(async (manager) => {
      const cartRepo = manager.getRepository(Cart);
      const cartItemRepo = manager.getRepository(CartItem);
      const discountRepo = manager.getRepository(DiscountCode);
      const orderRepo = manager.getRepository(Order);
      const orderItemRepo = manager.getRepository(OrderItem);
      const addressRepo = manager.getRepository(Address);

      // ---- Validate địa chỉ giao hàng, phải thuộc về chính user này ----
      const address = await addressRepo.findOne({
        where: { id: dto.address_id, user_id: userId },
      });
      if (!address) {
        throw new BadRequestException('Địa chỉ giao hàng không hợp lệ');
      }

      const cart = await cartRepo.findOne({ where: { user_id: userId } });
      if (!cart) throw new BadRequestException('Giỏ hàng trống');

      const cartItems = await cartItemRepo.find({
        where: { cart_id: cart.id },
        relations: { product: true },
      });
      if (!cartItems.length) throw new BadRequestException('Giỏ hàng trống');

      for (const item of cartItems) {
        if (!item.product || !item.product.is_active) {
          throw new BadRequestException(
            `Sản phẩm "${item.product?.name ?? item.product_id}" hiện không khả dụng`,
          );
        }
      }

      const subtotal = cartItems.reduce(
        (sum, item) => sum + Number(item.product.price) * item.quantity,
        0,
      );

      const shippingFee =
        subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

      let discount: DiscountCode | null = null;
      let freeshipDiscount: DiscountCode | null = null;
      let discountAmount = 0;
      let shippingDiscountAmount = 0;

      if (dto.discount_code) {
        discount = await this.validateDiscountCode(
          discountRepo,
          dto.discount_code,
          subtotal,
          'order',
        );
      }

      if (dto.freeship_code) {
        if (dto.discount_code && dto.freeship_code === dto.discount_code) {
          throw new BadRequestException(
            'Không thể dùng cùng một mã cho cả discount_code và freeship_code',
          );
        }
        freeshipDiscount = await this.validateDiscountCode(
          discountRepo,
          dto.freeship_code,
          subtotal,
          'free_shipping',
        );
      }

      if (discount) {
        if (discount.discount_type === 'percent') {
          discountAmount =
            (subtotal * Number(discount.discount_value)) / 100;
          if (discount.max_discount !== null) {
            discountAmount = Math.min(
              discountAmount,
              Number(discount.max_discount),
            );
          }
        } else {
          discountAmount = Number(discount.discount_value);
        }
        discountAmount = Math.round(Math.min(discountAmount, subtotal));
      }

      if (freeshipDiscount) {
        if (freeshipDiscount.discount_type === 'percent') {
          shippingDiscountAmount =
            (shippingFee * Number(freeshipDiscount.discount_value)) / 100;
          if (freeshipDiscount.max_discount !== null) {
            shippingDiscountAmount = Math.min(
              shippingDiscountAmount,
              Number(freeshipDiscount.max_discount),
            );
          }
        } else {
          shippingDiscountAmount = Number(freeshipDiscount.discount_value);
        }
        shippingDiscountAmount = Math.round(
          Math.min(shippingDiscountAmount, shippingFee),
        );
      }

      const total =
        subtotal + shippingFee - discountAmount - shippingDiscountAmount;

      const order = orderRepo.create({
        user_id: userId,
        cart_id: cart.id,
        address_id: address.id,
        shipping_full_address: address.full_address,
        shipping_recipient_name: address.recipient_name ?? null,
        shipping_phone_number: address.phone_number ?? null,
        discount_code_id: discount?.id ?? null,
        freeship_code_id: freeshipDiscount?.id ?? null,
        subtotal,
        shipping_fee: shippingFee,
        discount_amount: discountAmount,
        shipping_discount_amount: shippingDiscountAmount,
        total,
        status: 'pending',
        note: dto.note ?? null,
      });
      const savedOrder = await orderRepo.save(order);

      const orderItems = cartItems.map((item) =>
        orderItemRepo.create({
          order_id: savedOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
        }),
      );
      await orderItemRepo.save(orderItems);

      if (discount) {
        discount.used_count += 1;
        await discountRepo.save(discount);
      }
      if (freeshipDiscount) {
        freeshipDiscount.used_count += 1;
        await discountRepo.save(freeshipDiscount);
      }

      await cartItemRepo.delete({ cart_id: cart.id });

      return {
        id: savedOrder.id,
        subtotal: savedOrder.subtotal,
        shipping_fee: savedOrder.shipping_fee,
        discount_amount: savedOrder.discount_amount,
        shipping_discount_amount: savedOrder.shipping_discount_amount,
        total: savedOrder.total,
        status: savedOrder.status,
        shipping_address: {
          full_address: savedOrder.shipping_full_address,
          recipient_name: savedOrder.shipping_recipient_name,
          phone_number: savedOrder.shipping_phone_number,
        },
        created_at: savedOrder.created_at,
      };
    });
  }

  // GET /api/orders — không đổi
  async findMine(userId: string, query: QueryOrderDto) {
    const { status, page = 1, limit = 20 } = query;

    const [items, total] = await this.orderRepo.findAndCount({
      where: {
        user_id: userId,
        ...(status ? { status } : {}),
      },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const orderIds = items.map((o) => o.id);
    const counts = orderIds.length
      ? await this.orderItemRepo
          .createQueryBuilder('item')
          .select('item.order_id', 'order_id')
          .addSelect('COUNT(*)', 'item_count')
          .where('item.order_id IN (:...orderIds)', { orderIds })
          .groupBy('item.order_id')
          .getRawMany()
      : [];
    const countMap = new Map(
      counts.map((c) => [c.order_id, Number(c.item_count)]),
    );

    return {
      items: items.map((o) => ({
        id: o.id,
        total: o.total,
        status: o.status,
        created_at: o.created_at,
        item_count: countMap.get(o.id) ?? 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // GET /api/orders/:id — thêm shipping_address vào response
  async findOneMine(userId: string, id: string) {
    const order = await this.orderRepo.findOne({
      where: { id, user_id: userId },
      relations: { items: { product: true } },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    const productIds = order.items.map((i) => i.product_id);
    const primaryImages = productIds.length
      ? await this.imageRepo.find({
          where: { product_id: In(productIds), is_primary: true },
        })
      : [];
    const imageMap = new Map(
      primaryImages.map((img) => [img.product_id, img.image_url]),
    );

    return {
      id: order.id,
      items: order.items.map((item) => ({
        product: {
          id: item.product?.id,
          name: item.product?.name,
          price: item.product?.price,
          image: imageMap.get(item.product_id) ?? null,
        },
        quantity: item.quantity,
      })),
      subtotal: order.subtotal,
      shipping_fee: order.shipping_fee,
      discount_amount: order.discount_amount,
      shipping_discount_amount: order.shipping_discount_amount,
      total: order.total,
      status: order.status,
      note: order.note,
      shipping_address: {
        full_address: order.shipping_full_address,
        recipient_name: order.shipping_recipient_name,
        phone_number: order.shipping_phone_number,
      },
      created_at: order.created_at,
    };
  }

  // PUT /api/orders/:id/cancel — không đổi
  async cancel(userId: string, id: string) {
    const order = await this.orderRepo.findOne({
      where: { id, user_id: userId },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (!CANCELABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        'Đơn hàng đã được xử lý, không thể huỷ',
      );
    }

    order.status = 'cancelled';
    const saved = await this.orderRepo.save(order);

    return {
      id: saved.id,
      status: saved.status,
      updated_at: saved.updated_at,
    };
  }
}