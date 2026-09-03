// Nhóm /api/products.
//
// Cột decimal (price, rating) của Postgres về là CHUỖI — ép về number ngay tại đây
// (cùng cách orders.ts, discounts.ts) để màn hình không phải tự Number() từng chỗ.
import { api } from './client';
import { mapItems } from '../types';
import type { Paginated, Product, ProductSpec } from '../types';

type RawNumeric = string | number;

export interface ProductQuery {
  search?: string;
  categoryId?: string;
  brand?: string;
  tag?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'rating_desc' | 'newest';
  page?: number;
  limit?: number;
}

// GET /products trả bản RÚT GỌN, không phải entity Product đầy đủ
// (product.service.ts toListItem): không có category_id, images[], specs[].
export interface ProductListItem {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  rating: number | null;
  primary_image: string | null;
  category_name: string | null;
  tags: string[];
}

// Dùng chung với chat.ts: sản phẩm Gemini gợi ý trong metadata tin nhắn cũng là
// bản rút gọn này và cũng về dưới dạng chuỗi decimal.
export function normalizeProductListItem(
  p: Omit<ProductListItem, 'price' | 'rating'> & { price: RawNumeric; rating: RawNumeric | null },
): ProductListItem {
  return { ...p, price: Number(p.price), rating: p.rating == null ? null : Number(p.rating) };
}

// GET /products/:id/reviews — người viết chỉ có tên và ảnh, không có id tài khoản,
// nên app KHÔNG tự biết được "mình đã đánh giá sản phẩm này chưa".
export interface ProductReview {
  id: string;
  user_name: string;
  avatar_url: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  created_at: string;
}

export interface NewProductReview {
  rating: number; // 1..5
  title?: string;
  content?: string;
}

export const productApi = {
  // signal: màn tìm kiếm đổi từ khoá/bộ lọc liên tục — hủy request cũ thay vì để treo.
  list: (query: ProductQuery = {}, signal?: AbortSignal) =>
    api
      .get<Paginated<Parameters<typeof normalizeProductListItem>[0]>>('/products', { ...query }, { signal })
      .then((res) => mapItems(res, normalizeProductListItem)),
  brands: () => api.get<string[]>('/products/brands'),
  // GET /products/:id trả entity đầy đủ kèm review_count.
  detail: (id: string) =>
    api
      .get<
        Omit<Product, 'price' | 'rating'> & { price: RawNumeric; rating: RawNumeric | null; review_count: number }
      >(`/products/${id}`)
      .then((p) => ({ ...p, price: Number(p.price), rating: p.rating == null ? null : Number(p.rating) })),
  specs: (id: string) => api.get<ProductSpec[]>(`/products/${id}/specs`),

  reviews: (id: string, query: { page?: number; limit?: number } = {}) =>
    api
      .get<Paginated<Omit<ProductReview, 'rating'> & { rating: RawNumeric }>>(`/products/${id}/reviews`, { ...query })
      .then((res) => mapItems(res, (r) => ({ ...r, rating: Number(r.rating) }))),
  // Backend chặn: phải đăng nhập, phải có đơn 'paid' chứa sản phẩm, và mỗi người chỉ
  // đánh giá một lần — hai điều kiện sau app không kiểm trước được, cứ gửi rồi hiện
  // nguyên văn lỗi 403 trả về.
  createReview: (id: string, body: NewProductReview) =>
    api.post<unknown>(`/products/${id}/reviews`, body),
};
