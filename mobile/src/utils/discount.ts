import type { DiscountCodeItem } from '../api/discounts';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '../constants';

// Phí ship gốc của đơn (chưa tính mã freeship), theo BE/src/users/order/order.service.ts:
// đạt ngưỡng là miễn phí. Các màn Giỏ hàng / Thanh toán / Chọn mã đều lấy từ đây
// để luật chỉ nằm một chỗ.
export function baseShippingFee(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

// Tính số tiền được giảm của một mã, theo đúng BE/src/users/order/order.service.ts:
// điều kiện min_order_value luôn xét trên tạm tính; mã giảm tiền hàng tính trên tạm tính,
// còn mã freeship (kể cả loại percent) tính trên phí ship thực tế và không vượt phí ship.
// Truyền shippingFee (kể cả 0 khi đơn đã được miễn ship) nghĩa là đang tính mã freeship.
export function computeDiscount(
  voucher: DiscountCodeItem | null,
  subtotal: number,
  shippingFee: number | null = null,
): number {
  if (!voucher) return 0;
  if (voucher.min_order_value && subtotal < voucher.min_order_value) return 0;
  const base = shippingFee ?? subtotal;
  const raw =
    voucher.discount_type === 'percent'
      ? (base * voucher.discount_value) / 100
      : voucher.discount_value;
  const capped = voucher.max_discount ? Math.min(raw, voucher.max_discount) : raw;
  return Math.round(Math.min(capped, base));
}
