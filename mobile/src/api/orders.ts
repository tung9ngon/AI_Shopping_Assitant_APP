// Nhóm /api/orders. Tất cả đều cần đăng nhập (JwtAccessGuard).
//
// POST /orders lấy hàng từ GIỎ TRÊN MÁY CHỦ, không nhận danh sách sản phẩm: app chỉ
// gửi địa chỉ giao + mã giảm giá. Máy chủ tự tính tạm tính, phí ship, tiền giảm và
// tổng — con số hiện trên màn Đặt hàng chỉ là bản xem trước, số trong phản hồi mới là
// số chính thức. Đặt hàng xong backend xoá sạch giỏ, nên app phải tải lại giỏ.
//
// Các cột tiền là bigint nên Postgres trả về chuỗi — chuẩn hoá về number tại đây.
import { api } from './client';
import type { OrderStatus, Paginated } from '../types';

export interface OrderShippingAddress {
  full_address: string;
  recipient_name: string | null;
  phone_number: string | null;
}

// GET /orders — bản rút gọn, KHÔNG có danh sách sản phẩm, chỉ có số lượng dòng hàng.
export interface OrderListItem {
  id: string;
  total: number;
  status: OrderStatus;
  created_at: string;
  item_count: number;
}

export interface OrderDetailItem {
  product: {
    id: string;
    name: string;
    price: number;
    image: string | null;
  };
  quantity: number;
}

export interface OrderDetail {
  id: string;
  items: OrderDetailItem[];
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  shipping_discount_amount: number;
  total: number;
  status: OrderStatus;
  note: string | null;
  shipping_address: OrderShippingAddress;
  created_at: string;
}

// Phản hồi POST /orders: giống OrderDetail nhưng không kèm danh sách sản phẩm.
export type CreatedOrder = Omit<OrderDetail, 'items' | 'note'>;

export interface CreateOrderPayload {
  address_id: string;
  // Mã giảm tiền hàng và mã miễn phí ship dùng song song, không được trùng nhau.
  discount_code?: string;
  freeship_code?: string;
  note?: string;
}

interface RawMoney {
  subtotal: string | number;
  shipping_fee: string | number;
  discount_amount: string | number;
  shipping_discount_amount: string | number;
  total: string | number;
}

function normalizeMoney<T extends RawMoney>(raw: T) {
  return {
    ...raw,
    subtotal: Number(raw.subtotal),
    shipping_fee: Number(raw.shipping_fee),
    discount_amount: Number(raw.discount_amount),
    shipping_discount_amount: Number(raw.shipping_discount_amount),
    total: Number(raw.total),
  };
}

export interface OrderQuery {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

export const orderApi = {
  list: async (query: OrderQuery = {}): Promise<Paginated<OrderListItem>> => {
    const res = await api.get<Paginated<OrderListItem & { total: string | number }>>('/orders', {
      ...query,
    });
    const items = (res.items ?? res.data ?? []).map((o) => ({ ...o, total: Number(o.total) }));
    return { ...res, items, data: undefined };
  },

  detail: async (id: string): Promise<OrderDetail> => {
    const raw = await api.get<OrderDetail & RawMoney & { items: (OrderDetailItem & { product: { price: string | number } })[] }>(
      `/orders/${id}`,
    );
    return {
      ...normalizeMoney(raw),
      items: raw.items.map((item) => ({
        ...item,
        product: { ...item.product, price: Number(item.product.price) },
      })),
    };
  },

  create: async (payload: CreateOrderPayload): Promise<CreatedOrder> => {
    const raw = await api.post<CreatedOrder & RawMoney>('/orders', payload);
    return normalizeMoney(raw);
  },

  cancel: (id: string) =>
    api.put<{ id: string; status: OrderStatus; updated_at: string }>(`/orders/${id}/cancel`),
};
