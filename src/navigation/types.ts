// Danh sách tham số của từng tuyến. Thay cho bảng route của React Router bản web.
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { PaymentMethod } from '../types';

export type TabParamList = {
  Home: undefined;
  Products: { categoryId?: string; keyword?: string } | undefined;
  Chat: undefined;
  Cart: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  ProductDetail: { productId: string };
  // Màn hình chọn mã trả kết quả về đây qua tham số tuyến (giữ dữ liệu ở dạng
  // tuần tự hoá được — React Navigation cảnh báo nếu truyền hàm qua params).
  Checkout: { orderVoucherId?: string | null; shipVoucherId?: string | null } | undefined;
  VoucherPicker: { subtotal: number; orderVoucherId: string | null; shipVoucherId: string | null };
  OrderSuccess: { orderId: string; total: number; method: PaymentMethod };
  Orders: undefined;
  OrderDetail: { orderId: string };
  PriceAlerts: undefined;
  Login: undefined;
  Register: undefined;
};
