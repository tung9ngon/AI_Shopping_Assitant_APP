// Giỏ hàng, gọi thật vào /api/cart.
//
// Giỏ nằm trên máy chủ và gắn với tài khoản (JwtAccessGuard), nên chưa đăng nhập thì
// không có giỏ — giữ giỏ rỗng thay vì gọi API để khỏi nhận 401 liên tục.
//
// POST /cart/items và PUT /cart/items/:id chỉ trả về dòng vừa đổi, không trả giỏ mới,
// nên sau mỗi thao tác phải tải lại GET /cart để lấy `subtotal` do backend tính.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cartApi } from '../api/cart';
import { getErrorMessage } from '../api/client';
import { useAuth } from './AuthContext';
import type { Cart, Product } from '../types';

const EMPTY_CART: Cart = { id: '', items: [], subtotal: 0 };

// Bấm +/- liên tiếp thì mỗi cú bấm không đáng một vòng PUT + GET riêng: dồn các cú
// bấm trong khoảng này thành một PUT với số lượng cuối cùng, rồi một GET /cart.
const QUANTITY_DEBOUNCE_MS = 400;

interface CartContextValue {
  cart: Cart;
  itemCount: number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  add: (product: Product, quantity: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hai lần reload chạy song song (bấm +/- nhanh) có thể resolve ngược thứ tự —
  // đánh số từng lượt, chỉ nhận kết quả của lượt mới nhất để giỏ không bị ghi đè
  // bằng dữ liệu cũ.
  const reloadSeq = useRef(0);

  const reload = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(EMPTY_CART);
      return;
    }
    const seq = ++reloadSeq.current;
    setLoading(true);
    setError(null);
    try {
      const fresh = await cartApi.get();
      if (seq === reloadSeq.current) setCart(fresh);
    } catch (err) {
      if (seq === reloadSeq.current) setError(getErrorMessage(err));
    } finally {
      if (seq === reloadSeq.current) setLoading(false);
    }
  }, [isAuthenticated]);

  // Đăng nhập xong thì nạp giỏ của tài khoản; đăng xuất thì xoá khỏi màn hình.
  useEffect(() => {
    reload();
  }, [reload]);

  const add = useCallback(
    async (product: Product, quantity: number) => {
      await cartApi.addItem(product.id, quantity);
      await reload();
    },
    [reload],
  );

  // Lượt PUT đang chờ dồn của từng dòng hàng. Cú bấm mới thay cú bấm cũ chưa kịp
  // gửi — promise của cú cũ được resolve luôn (thao tác của nó đã gộp vào cú mới,
  // chỉ cú cuối cùng còn có thể báo lỗi, nên lỗi mạng cũng chỉ hiện MỘT thông báo).
  const pendingWrites = useRef(
    new Map<
      string,
      { timer: ReturnType<typeof setTimeout>; resolve: () => void; reject: (err: unknown) => void }
    >(),
  );

  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      // Cập nhật lạc quan trước khi gọi API: stepper tính bước kế tiếp từ số đang
      // hiện, không cập nhật ngay thì hai lần bấm "+" liên tiếp cùng tính từ số cũ
      // và mất một thao tác. Subtotal chỉnh tạm theo giá dòng — GET /cart sau lượt
      // ghi dồn mới là số chính thức, và kể cả khi PUT lỗi thì reload trả lại sự thật.
      setCart((prev) => ({
        ...prev,
        items: prev.items.map((it) => (it.id === itemId ? { ...it, quantity } : it)),
        subtotal: prev.items.reduce(
          (sum, it) =>
            sum + it.product.price * (it.id === itemId ? quantity : it.quantity),
          0,
        ),
      }));
      return new Promise<void>((resolve, reject) => {
        const prev = pendingWrites.current.get(itemId);
        if (prev) {
          clearTimeout(prev.timer);
          prev.resolve();
        }
        const timer = setTimeout(async () => {
          pendingWrites.current.delete(itemId);
          try {
            await cartApi.updateItem(itemId, quantity);
            resolve();
          } catch (err) {
            reject(err);
          } finally {
            void reload();
          }
        }, QUANTITY_DEBOUNCE_MS);
        pendingWrites.current.set(itemId, { timer, resolve, reject });
      });
    },
    [reload],
  );

  const remove = useCallback(
    async (itemId: string) => {
      // Dòng sắp bị xoá thì lượt PUT đang chờ dồn của nó không còn ý nghĩa.
      const pending = pendingWrites.current.get(itemId);
      if (pending) {
        clearTimeout(pending.timer);
        pending.resolve();
        pendingWrites.current.delete(itemId);
      }
      await cartApi.removeItem(itemId);
      await reload();
    },
    [reload],
  );

  const itemCount = useMemo(
    () => cart.items.reduce((sum, it) => sum + it.quantity, 0),
    [cart],
  );

  const value = useMemo(
    () => ({ cart, itemCount, loading, error, reload, add, updateQuantity, remove }),
    [cart, itemCount, loading, error, reload, add, updateQuantity, remove],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart phải nằm trong CartProvider');
  return ctx;
}
