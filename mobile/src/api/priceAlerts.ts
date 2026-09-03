// Nhóm /api/price-alerts. Cần đăng nhập.
//
// Backend chạy cron mỗi 30 giây so giá hiện tại với ngưỡng đặt; chạm ngưỡng thì đổi
// trạng thái sang 'triggered' (và gửi email nếu chọn kênh email).
//
// DELETE là xoá MỀM: bản ghi chuyển sang 'cancelled' chứ không biến mất, mà GET vẫn
// trả về cả các bản ghi đó — nên danh sách phải tự lọc.
import { api } from './client';
import type { NotifyChannel } from '../types';

export type PriceAlertStatus = 'active' | 'triggered' | 'cancelled';

export interface PriceAlertItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    image: string | null;
  };
  target_price: number;
  status: PriceAlertStatus;
  notify_channel: NotifyChannel;
  created_at: string;
}

interface RawPriceAlertItem extends Omit<PriceAlertItem, 'target_price' | 'product'> {
  product: Omit<PriceAlertItem['product'], 'price'> & { price: string | number };
  target_price: string | number;
}

export const priceAlertApi = {
  list: async (): Promise<PriceAlertItem[]> => {
    const raw = await api.get<RawPriceAlertItem[]>('/price-alerts');
    return raw.map((a) => ({
      ...a,
      target_price: Number(a.target_price),
      product: { ...a.product, price: Number(a.product.price) },
    }));
  },

  create: (productId: string, targetPrice: number, notifyChannel: NotifyChannel = 'app') =>
    api.post<{ id: string; product_id: string; target_price: string | number; status: PriceAlertStatus }>(
      '/price-alerts',
      { product_id: productId, target_price: targetPrice, notify_channel: notifyChannel },
    ),

  remove: (id: string) => api.del<{ message: string }>(`/price-alerts/${id}`),
};
