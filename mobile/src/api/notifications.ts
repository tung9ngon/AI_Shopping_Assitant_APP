// Nhóm /api/notifications. Tất cả đều cần đăng nhập (JwtAccessGuard).
//
// Bảng notifications đã có sẵn trong CSDL nhưng backend chưa có chỗ nào SINH ra bản
// ghi — danh sách sẽ rỗng cho tới khi có nguồn ghi vào (đặt hàng, đổi trạng thái đơn,
// chạm ngưỡng giá…). Màn Thông báo vì thế phải xử lý trạng thái rỗng cho tử tế.
import { api } from './client';
import type { Paginated } from '../types';

export type NotificationType =
  | 'price_alert'
  | 'deal'
  | 'recommendation'
  | 'order_update'
  | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  // Dữ liệu kèm theo do backend ghi: product_id, order_id, url…
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationQuery {
  page?: number;
  limit?: number;
  unread?: boolean;
}

export const notificationApi = {
  list: (query: NotificationQuery = {}, signal?: AbortSignal) =>
    api.get<Paginated<NotificationItem>>(
      '/notifications',
      {
        page: query.page,
        limit: query.limit,
        // BE nhận chuỗi 'true'/'false' vì đây là query string.
        unread: query.unread ? 'true' : undefined,
      },
      { signal },
    ),

  unreadCount: (signal?: AbortSignal) =>
    api.get<{ count: number }>('/notifications/unread-count', undefined, { signal }),

  markRead: (id: string) =>
    api.put<{ id: string; is_read: boolean }>(`/notifications/${id}/read`),

  markAllRead: () => api.put<{ updated: number }>('/notifications/read-all'),
};
