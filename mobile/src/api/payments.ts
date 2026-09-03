// Nhóm /api/payments. Cần đăng nhập.
//
// POST /payments chỉ tạo được MỘT giao dịch cho mỗi đơn: gọi lần hai trên cùng đơn
// backend trả 409. Đơn cũng phải đang ở trạng thái 'pending'.
//
// GET /payments/:id/status là nguồn sự thật duy nhất về việc đã trả tiền hay chưa.
// Webhook PayOS không gọi được vào máy chạy backend ở mạng nội bộ, nên chính endpoint
// này chủ động hỏi PayOS rồi đồng bộ vào DB — app cứ hỏi lại nó là đủ.
import { api } from './client';
import type { PaymentMethod, PaymentStatus } from '../types';

export interface CreatedPayment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  amount: number; // decimal -> chuỗi ở runtime, đã Number() sẵn trong create()
  currency: string;
  status: PaymentStatus;
  // Link cổng thanh toán và chuỗi VietQR. Chỉ có với method 'payos', COD trả null.
  payment_url: string | null;
  qr_code: string | null;
}

export interface PaymentStatusInfo {
  id: string;
  status: PaymentStatus;
  paid_at: string | null;
  transaction_id: string | null;
}

export const paymentApi = {
  // Chuẩn hoá amount ngay tại đây (cùng quy ước với orders.ts / discounts.ts) — không
  // đẩy việc Number() ra màn hình.
  create: (orderId: string, method: PaymentMethod) =>
    api
      .post<Omit<CreatedPayment, 'amount'> & { amount: string | number }>('/payments', {
        order_id: orderId,
        method,
      })
      .then((p): CreatedPayment => ({ ...p, amount: Number(p.amount) })),
  status: (paymentId: string) => api.get<PaymentStatusInfo>(`/payments/${paymentId}/status`),
};
