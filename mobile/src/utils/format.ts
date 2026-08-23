// Định dạng tiền VND
export function formatVND(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return '—₫';
  return n.toLocaleString('vi-VN') + '₫';
}

// Định dạng ngày giờ đầy đủ
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleString('vi-VN');
}

// Định dạng chỉ ngày (dd/MM/yyyy) — dùng cho ProfilePage, các nơi không cần giờ.
export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

// Nhãn tiếng Việt cho trạng thái đơn hàng
export const ORDER_STATUS_LABEL: Record<string, string> = {
  simulated_success: 'Hoàn tất (mô phỏng)',
  cancelled: 'Đã huỷ',
  pending: 'Chờ xử lý',
  paid: 'Đã thanh toán',
  shipped: 'Đang giao',
};

export const ORDER_STATUS_COLOR: Record<string, string> = {
  simulated_success: 'green',
  cancelled: 'red',
  pending: 'gold',
  paid: 'blue',
  shipped: 'cyan',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ thanh toán',
  success: 'Thành công',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

export const PAYMENT_STATUS_COLOR: Record<string, string> = {
  pending: 'gold',
  success: 'green',
  failed: 'red',
  refunded: 'purple',
};
