// Nhóm /api/discount-codes. Public, không cần đăng nhập.
//
// Hai điểm cần nhớ khi dùng:
//   - Danh sách KHÔNG trả `id`, cũng không trả usage_limit/used_count. Mã được định
//     danh bằng `code`, và đó cũng là thứ POST /orders nhận.
//   - Các cột tiền là bigint nên driver Postgres trả về chuỗi. Chuẩn hoá về number
//     ngay ở đây để màn hình không phải Number() từng chỗ.
import { api } from './client';
import type { DiscountType, Paginated, VoucherCategory } from '../types';

export interface DiscountCodeItem {
  code: string;
  description: string | null;
  category: VoucherCategory;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value: number | null;
  max_discount: number | null;
  valid_until: string | null;
}

interface RawDiscountCodeItem {
  code: string;
  description: string | null;
  category: VoucherCategory;
  discount_type: DiscountType;
  discount_value: string | number;
  min_order_value: string | number | null;
  max_discount: string | number | null;
  valid_until: string | null;
}

function toNumber(value: string | number | null): number | null {
  return value === null ? null : Number(value);
}

function normalize(raw: RawDiscountCodeItem): DiscountCodeItem {
  return {
    ...raw,
    discount_value: Number(raw.discount_value),
    min_order_value: toNumber(raw.min_order_value),
    max_discount: toNumber(raw.max_discount),
  };
}

// Không truyền `order_value`: backend sẽ lọc bỏ các mã chưa đạt giá trị tối thiểu,
// mà màn hình chọn mã cần hiện chúng ở dạng mờ kèm "mua thêm N để dùng mã này".
async function list(path: string): Promise<DiscountCodeItem[]> {
  const res = await api.get<Paginated<RawDiscountCodeItem>>(path, { limit: 50 });
  return (res.items ?? res.data ?? []).map(normalize);
}

export const discountApi = {
  listOrderCodes: () => list('/discount-codes'),
  listFreeshipCodes: () => list('/discount-codes/freeship'),
};
