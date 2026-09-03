// ===== Kiểu dữ liệu dùng chung, ánh xạ theo entity/DTO của backend NestJS =====

export type UserRole = 'user' | 'admin';

// ---- Hồ sơ tài khoản (GET/PUT /api/users/me) ----
export interface MeAccount {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface UpdateMePayload {
  full_name?: string;
  // null = xoá số điện thoại. Không gửi chuỗi rỗng — @Matches phía BE từ chối ''.
  phone_number?: string | null;
  avatar_url?: string;
}

// ---- Hồ sơ mua sắm (GET/PUT /api/users/me/profile) ----
export interface ShoppingProfile {
  user_segment: string | null;
  occupation: string | null;
  age_range: string | null;
  interests: string[];
}

// ---- Sở thích/tuỳ chọn (GET/PUT /api/users/me/preferences) ----
export interface BudgetRange {
  min: number;
  max: number;
}

export interface UserPreferences {
  preferred_categories: string[];
  budget_range: BudgetRange | null;
  preferred_brands: string[];
  preferred_attributes: Record<string, unknown>;
  last_intent_summary: string | null;
}

// ---- Category ----
export interface Category {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  products?: Product[];
}

// ---- Product ----
export interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

// Ảnh đại diện của sản phẩm: ưu tiên ảnh gắn cờ is_primary, không có thì lấy ảnh đầu.
export function primaryImageOf(images: ProductImage[] | undefined): string | null {
  return images?.find((img) => img.is_primary)?.image_url ?? images?.[0]?.image_url ?? null;
}

export interface ProductSpec {
  id: string;
  spec_key: string;
  spec_value: string;
  spec_unit: string | null;
}

export interface Tag {
  id: string;
  name?: string;
  tag?: string;
}

export interface Product {
  id: string;
  name: string;
  category_id: string | null;
  brand: string | null;
  price: number; // decimal -> chuỗi ở runtime, productApi đã ép về number
  rating: number | null; // như trên
  description: string | null;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  images?: ProductImage[];
  specs?: ProductSpec[];
  tags?: Tag[];
}

// ---- Address (sổ địa chỉ - nhiều địa chỉ / 1 tài khoản) ----
// Khớp BE: GET /api/users/me/addresses (address.entity.ts)
export interface Address {
  id: string;
  full_address: string;
  recipient_name?: string | null;
  phone_number?: string | null;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

// ---- Cart (khớp CHÍNH XÁC response GET /api/cart) ----
export interface CartItemProduct {
  id: string;
  name: string;
  price: number; // decimal -> chuỗi ở runtime, cartApi đã ép về number
  image: string | null; // URL ảnh primary hoặc null (KHÔNG phải mảng)
}

export interface CartItem {
  id: string; // = cart_item id (dùng cho PUT/DELETE)
  product: CartItemProduct;
  quantity: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number; // BE tính sẵn (number)
}

// ---- Order ----
export type OrderStatus =
  | 'simulated_success'
  | 'cancelled'
  | 'pending'
  | 'paid'
  | 'shipped';

// Bản ghi Order/OrderItem đầy đủ nằm ở src/api/orders.ts (OrderDetail…) — response
// thật của backend. Đừng thêm lại bản sao entity ở đây kẻo import nhầm kiểu lệch shape.

// ---- Discount code ----
// Bản ghi chi tiết nằm ở src/api/discounts.ts (DiscountCodeItem).
export type VoucherCategory = 'order' | 'free_shipping';
export type DiscountType = 'percent' | 'fixed_amount';

// ---- Price alert ----
// Bản ghi chi tiết nằm ở src/api/priceAlerts.ts (PriceAlertItem).
export type NotifyChannel = 'app' | 'email' | 'sms';

// ---- Payment ----
// Bản ghi chi tiết nằm ở src/api/payments.ts (CreatedPayment, PaymentStatusInfo).
export type PaymentMethod = 'cod' | 'payos';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

// ---- Phản hồi phân trang thường gặp ----
export interface Paginated<T> {
  data?: T[];
  items?: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

// Lấy mảng phần tử từ response phân trang — backend có thể trả `data` hoặc `items`.
export function getItems<T>(res: Paginated<T>): T[] {
  return res.items ?? res.data ?? [];
}

// Biến đổi từng phần tử của trang mà giữ nguyên phong bì phân trang (total, page…).
export function mapItems<T, U>(res: Paginated<T>, fn: (item: T) => U): Paginated<U> {
  return { ...res, items: res.items?.map(fn), data: res.data?.map(fn) };
}
