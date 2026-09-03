// Nhóm /api/cart. Tất cả đều cần đăng nhập (JwtAccessGuard).
//
// POST/PUT chỉ trả về dòng vừa đổi, không trả giỏ mới — nên sau mỗi lần đổi phải
// gọi lại `get()` để lấy subtotal backend tính.
import { api } from './client';
import type { Cart, CartItem } from '../types';

export const cartApi = {
  // Backend trả subtotal là number nhưng product.price là chuỗi decimal
  // (cart.service.ts) — ép về number tại đây cho đồng bộ với các api/ khác.
  get: () =>
    api
      .get<Omit<Cart, 'items'> & { items: (CartItem & { product: { price: string | number } })[] }>('/cart')
      .then((cart) => ({
        ...cart,
        items: cart.items.map((it) => ({
          ...it,
          product: { ...it.product, price: Number(it.product.price) },
        })),
      })),
  addItem: (productId: string, quantity = 1) =>
    api.post<unknown>('/cart/items', { product_id: productId, quantity }),
  updateItem: (itemId: string, quantity: number) =>
    api.put<unknown>(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId: string) => api.del<unknown>(`/cart/items/${itemId}`),
};
