// Danh sách tham số của từng tuyến. Thay cho bảng route của React Router bản web.
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { PaymentMethod } from '../types';
import type { DiscountCodeItem } from '../api/discounts';
import type { ProductQuery } from '../api/products';

export type TabParamList = {
  Home: undefined;
  // `sort`: băng "Đánh giá cao nhất" ở trang chủ mở danh sách đã xếp theo điểm.
  Products:
    | { categoryId?: string; keyword?: string; brand?: string; sort?: NonNullable<ProductQuery['sort']> }
    | undefined;
  Chat: undefined;
  Cart: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  ProductDetail: { productId: string };
  // Màn hình chọn mã trả kết quả về đây qua tham số tuyến (giữ dữ liệu ở dạng
  // tuần tự hoá được — React Navigation cảnh báo nếu truyền hàm qua params).
  // Trả nguyên object mã đã chọn để Checkout tính được bản xem trước mà không phải
  // tải lại danh sách mã lần nữa.
  // `buyNowItemId`: vào từ nút "Mua ngay" ở màn chi tiết — đơn chỉ gồm đúng dòng giỏ
  // này, không kéo theo các dòng đang tick trong giỏ.
  Checkout:
    | {
        orderVoucher?: DiscountCodeItem | null;
        shipVoucher?: DiscountCodeItem | null;
        buyNowItemId?: string;
      }
    | undefined;
  VoucherPicker: { subtotal: number; orderVoucherCode: string | null; shipVoucherCode: string | null };
  OrderSuccess: { orderId: string; total: number; method: PaymentMethod };
  Orders: undefined;
  OrderDetail: { orderId: string };
  PriceAlerts: undefined;
  Notifications: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  AddressBook: undefined;
  // Không có addressId = thêm mới địa chỉ. `pickedAddress` là chuỗi địa chỉ màn
  // Chọn trên bản đồ trả ngược về (cùng lối với VoucherPicker -> Checkout: trả kết
  // quả qua tham số tuyến, không truyền hàm callback).
  AddressForm: { addressId?: string; pickedAddress?: string };
  // Toạ độ mở đầu: lấy từ gợi ý người dùng vừa chọn, không có thì màn tự lấy mặc định.
  // `addressId` chỉ đi nhờ để trả lại đúng cho màn Thêm/Sửa địa chỉ lúc quay về.
  LocationPicker: { addressId?: string; lat?: number; lon?: number };
  Profile: undefined;
  Preferences: undefined;
  Reviews: { productId: string };
  // Tên + ảnh truyền theo tuyến: hai màn gọi (Đánh giá, Chi tiết đơn) đều đang giữ
  // sẵn, màn Viết đánh giá không phải tải lại cả chi tiết sản phẩm chỉ để hiện header.
  WriteReview: { productId: string; productName: string; productImage: string | null };
  // Giao dịch được tạo ở màn Đặt hàng (POST /api/payments) rồi truyền sang đây: mỗi đơn
  // chỉ tạo được một giao dịch, gọi lại lần nữa backend trả 409.
  PayosPayment: {
    orderId: string;
    paymentId: string;
    total: number;
    qrCode: string | null;
    paymentUrl: string | null;
  };
  // Chỉ dùng cho các kết cục KHÔNG thành công — thành công đi thẳng sang OrderSuccess.
  PaymentResult: { orderId: string; outcome: 'cancelled' | 'failed' | 'unverified' };
};
