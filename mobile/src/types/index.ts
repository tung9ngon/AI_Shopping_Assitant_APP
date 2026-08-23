// ===== Kiểu dữ liệu dùng chung, ánh xạ theo entity/DTO của backend NestJS =====

export type UserRole = 'user' | 'admin';
export type AuthProvider = 'local' | 'google' | 'facebook';

export interface AuthUser {
  id: string;
  email: string | null;
  full_name: string;
  role?: UserRole;
  avatar_url?: string | null;
}

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
  phone_number?: string;
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
  price: string | number; // decimal -> string ở runtime
  rating: string | null;
  description: string | null;
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
  price: string | number; // decimal -> string ở runtime
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

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: Product;
}

export interface Order {
  id: string;
  user_id: string;
  cart_id: string | null;
  discount_code_id: string | null;
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  total: number;
  status: OrderStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  payment?: Payment;
  user?: { id: string; full_name: string; email: string | null };
}

// ---- Discount code ----
export type VoucherCategory = 'order' | 'free_shipping';
export type DiscountType = 'percent' | 'fixed_amount';
export interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  category: VoucherCategory;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value: number | null;
  max_discount: number | null;
  usage_limit: number | null;
  used_count?: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  status?: 'running' | 'paused' | 'upcoming' | 'expired';
  created_at?: string;
}

// ---- Price alert ----
export type NotifyChannel = 'app' | 'email' | 'sms';
export interface PriceAlert {
  id: string;
  product_id: string;
  target_price: number;
  notify_channel: NotifyChannel;
  is_active?: boolean;
  created_at: string;
  product?: Product;
}

// ---- Payment ----
export type PaymentMethod = 'cod' | 'payos';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
export interface Payment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  checkout_url?: string | null;
  created_at: string;
  updated_at: string;
}

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
