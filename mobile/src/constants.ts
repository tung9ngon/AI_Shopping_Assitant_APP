// Hằng số nghiệp vụ, chép đúng theo backend.
//
// Máy chủ mới là nơi tính tiền thật (BE/src/users/order/order.service.ts). Hai giá trị
// dưới đây chỉ để màn Giỏ hàng và Đặt hàng hiện trước cho người dùng thấy — đổi ở
// backend thì phải đổi ở đây.
export const SHIPPING_FEE = 30_000;
export const FREE_SHIPPING_THRESHOLD = 500_000;

// Khớp @Matches trong BE (profile.dto.ts / address DTO) — đổi ở backend thì đổi ở đây.
export const PHONE_PATTERN = /^[0-9+ ]{8,15}$/;
export const PHONE_MESSAGE = 'Số điện thoại 8-15 ký tự (chỉ số, dấu +, khoảng trắng)';

// Khớp PASSWORD_REGEX trong BE/src/users/auth/auth.dto.ts.
export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
export const PASSWORD_MESSAGE = 'Mật khẩu cần tối thiểu 8 ký tự, có ít nhất 1 chữ hoa và 1 chữ số';
