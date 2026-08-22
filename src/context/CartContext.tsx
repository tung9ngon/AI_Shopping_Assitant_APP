// Giỏ hàng cho vòng dựng giao diện.
//
// Bản web giữ giỏ trên máy chủ (FE/src/context/CartContext.tsx gọi GET /api/cart).
// Ở đây giỏ nằm trong bộ nhớ tiến trình để màn hình chạy được độc lập; tên trường và
// kiểu dữ liệu giữ nguyên theo `Cart` nên khi đấu API thật chỉ thay phần nạp dữ liệu.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { mockCart } from '../mocks/data';
import type { Cart, Product } from '../types';

interface CartContextValue {
  cart: Cart;
  itemCount: number;
  add: (product: Product, quantity: number) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  remove: (itemId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function withSubtotal(items: Cart['items'], id: string): Cart {
  return {
    id,
    items,
    subtotal: items.reduce((sum, it) => sum + Number(it.product.price) * it.quantity, 0),
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(mockCart);

  const add = useCallback((product: Product, quantity: number) => {
    setCart((prev) => {
      const existing = prev.items.find((it) => it.product.id === product.id);
      const items = existing
        ? prev.items.map((it) =>
            it.product.id === product.id ? { ...it, quantity: it.quantity + quantity } : it,
          )
        : [
            ...prev.items,
            {
              id: `ci-${product.id}`,
              quantity,
              product: {
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.images?.[0]?.image_url ?? null,
              },
            },
          ];
      return withSubtotal(items, prev.id);
    });
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    setCart((prev) =>
      withSubtotal(
        prev.items.map((it) => (it.id === itemId ? { ...it, quantity } : it)),
        prev.id,
      ),
    );
  }, []);

  const remove = useCallback((itemId: string) => {
    setCart((prev) => withSubtotal(prev.items.filter((it) => it.id !== itemId), prev.id));
  }, []);

  const clear = useCallback(() => {
    setCart((prev) => withSubtotal([], prev.id));
  }, []);

  const itemCount = useMemo(
    () => cart.items.reduce((sum, it) => sum + it.quantity, 0),
    [cart],
  );

  const value = useMemo(
    () => ({ cart, itemCount, add, updateQuantity, remove, clear }),
    [cart, itemCount, add, updateQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart phải nằm trong CartProvider');
  return ctx;
}
