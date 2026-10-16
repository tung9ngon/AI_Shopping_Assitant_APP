import type { TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Design token cho ứng dụng di động.
//
// Nhận diện "Graphite & Jade": nền giấy ấm, chữ và nút hành động chính màu mực,
// xanh ngọc trầm làm màu thương hiệu cho điểm nhấn (liên kết, trạng thái chọn,
// biểu tượng), đỏ gạch chỉ dành cho ưu đãi/giảm giá. Không dùng màu neon hay
// gradient rực — chiều sâu đến từ tương phản mực/giấy và thứ bậc chữ.
// Không còn bám màu cam của bản web (FE/src/main.tsx) — app có nhận diện riêng.

export const colors = {
  // Thương hiệu: xanh ngọc trầm. Tương phản với nền trắng ~6.2:1, đủ cho chữ nhỏ.
  primary: '#0f6e5e',
  primaryDark: '#0a5649',
  primarySoft: '#e6f1ee',

  // Mực: nút hành động chính, chip đang chọn, giá tiền, khối tối ở đầu trang.
  ink: '#17181b',
  inkSoft: '#2b2d33',

  // Ưu đãi / giảm giá / chấm báo — đỏ gạch, không phải đỏ báo lỗi chói.
  accent: '#b8432f',
  accentSoft: '#fbede9',

  text: '#17181b',
  textSecondary: '#4f535b',
  // #6e727a: tương phản ~4.8:1 trên trắng — chữ phụ cỡ nhỏ vẫn đạt WCAG AA.
  textMuted: '#6e727a',
  textInverse: '#ffffff',

  bg: '#f3f2ee',
  surface: '#ffffff',
  surfaceAlt: '#f8f7f4',
  border: '#e6e3dc',
  borderStrong: '#d2cec5',

  success: '#2f7d4f',
  warning: '#b7791f',
  danger: '#c0392b',
  info: '#2f5fb3',

  // Sao đánh giá: vàng nghệ trầm, không dùng vàng chanh.
  star: '#d69e2e',
} as const;

// Dải chuyển sắc. React Native không vẽ được gradient bằng style; component
// components/Gradient.tsx dựng lại bằng react-native-svg từ các dải khai ở đây.
export const gradient = {
  // Mực pha chút xanh ngọc — dùng cho khối tối ở đầu trang chủ, avatar, cuống vé.
  // Biên độ hẹp có chủ ý: nhìn như một mặt phẳng có ánh sáng, không phải dải màu.
  brand: ['#1f2b28', '#18201e', '#131816'],
  // Nền rất nhạt cho ô biểu tượng, huy hiệu — chữ đen vẫn đọc được trên nền này.
  brandSoft: ['#eef5f2', '#e1ede8'],
  // Báo thành công (đặt hàng xong, thanh toán xong).
  success: ['#3d8b5e', '#2a6b45'],
} as const;

// utils/format.ts (copy từ web) trả về tên màu của Ant Design Tag — 'gold', 'cyan'…
// React Native không có hệ màu theo tên, nên ánh xạ sang cặp nền/chữ tại đây.
// Các cặp được hạ độ bão hoà cho hợp nền giấy ấm.
export const tagPalette: Record<string, { bg: string; fg: string }> = {
  green: { bg: '#e9f4ec', fg: '#2a6b45' },
  red: { bg: '#fbeceb', fg: '#a8322a' },
  gold: { bg: '#f8f0dc', fg: '#8a5a12' },
  blue: { bg: '#e8eef8', fg: '#2f5fb3' },
  cyan: { bg: '#e4f1ef', fg: '#0f6e5e' },
  purple: { bg: '#efebf6', fg: '#5b4a8a' },
  default: { bg: '#f1efea', fg: '#4f535b' },
};

// Chiều cao thanh tab = phần nội dung cố định + inset đáy của từng máy (home
// indicator iPhone, thanh gesture Android edge-to-edge). Không hardcode inset:
// Android 16 buộc edge-to-edge nên số cứng sẽ bị thanh gesture đè lên, còn iPhone
// không có home indicator thì thừa 30px trống.
// Phần nội dung: icon 24 + nhãn 17 + paddingTop 6 + đệm ~13 (xem chú thích tabBar
// ở navigation/index.tsx — tối thiểu 51 để nhãn tiếng Việt không mất chân dấu).
export const tabBarContentHeight = 60;

// Dùng cho cả thanh tab lẫn các màn hình trong tab (phải chừa đúng khoảng này ở
// cuối nội dung, nếu không phần cuối trang bị thanh tab che mất).
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return tabBarContentHeight + Math.max(insets.bottom, 8);
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

// Khai riêng ngoài `as const`: mảng readonly không gán được vào TextStyle.fontVariant.
const tabularNums: TextStyle['fontVariant'] = ['tabular-nums'];

export const font = {
  h1: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  h2: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  h3: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' },
  bodyStrong: { fontSize: 15, fontWeight: '600' },
  small: { fontSize: 13, fontWeight: '400' },
  caption: { fontSize: 11, fontWeight: '500' },
  // Giá tiền: số đều bề ngang để cột giá thẳng hàng, không nhảy khi đổi số lượng.
  price: { fontWeight: '800', letterSpacing: -0.3, fontVariant: tabularNums },
} as const;

// Đổ bóng: iOS dùng shadow*, Android dùng elevation — khai báo cả hai.
// Bóng trung tính, tán rộng, đậm độ thấp: thẻ "nằm" trên giấy chứ không bay lên.
export const shadow = {
  card: {
    shadowColor: '#1a1a17',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#1a1a17',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  // Bóng của khối nổi hẳn lên khỏi nền (thẻ đè lên đầu trang, thanh tìm kiếm trên
  // nền tối). Đổ xuống xa hơn `card` để thấy rõ khoảng cách giữa hai lớp.
  float: {
    shadowColor: '#0b1412',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
} as const;
