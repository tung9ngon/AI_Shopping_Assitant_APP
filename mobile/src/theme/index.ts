import { Platform } from 'react-native';

// Design token cho ứng dụng di động.
//
// Nhận diện lấy đúng theo bản web (FE/src/main.tsx): colorPrimary #f26d21,
// borderRadius 8. Phần bổ sung ở đây là những thứ web lấy sẵn từ Ant Design mà
// React Native không có: thang khoảng cách, thang chữ, đổ bóng theo nền tảng.

export const colors = {
  primary: '#f26d21',
  primaryDark: '#e8530e',
  primarySoft: '#fff3ec',

  text: '#1f1f1f',
  textSecondary: '#5c5c5c',
  textMuted: '#8c8c8c',
  textInverse: '#ffffff',

  bg: '#f4f5f7',
  surface: '#ffffff',
  surfaceAlt: '#fafafa',
  border: '#e8e8e8',
  borderStrong: '#d9d9d9',

  success: '#52c41a',
  warning: '#faad14',
  danger: '#ff4d4f',
  info: '#1677ff',
} as const;

// utils/format.ts (copy từ web) trả về tên màu của Ant Design Tag — 'gold', 'cyan'…
// React Native không có hệ màu theo tên, nên ánh xạ sang cặp nền/chữ tại đây.
export const tagPalette: Record<string, { bg: string; fg: string }> = {
  green: { bg: '#f6ffed', fg: '#389e0d' },
  red: { bg: '#fff1f0', fg: '#cf1322' },
  gold: { bg: '#fffbe6', fg: '#d48806' },
  blue: { bg: '#e6f4ff', fg: '#0958d9' },
  cyan: { bg: '#e6fffb', fg: '#08979c' },
  purple: { bg: '#f9f0ff', fg: '#531dab' },
  default: { bg: '#fafafa', fg: '#595959' },
};

// Chiều cao thanh tab. Khai ở đây vì các màn hình nằm trong tab phải tự chừa đúng
// khoảng này ở cuối nội dung, nếu không phần cuối trang bị thanh tab che mất.
export const tabBarHeight = Platform.OS === 'ios' ? 90 : 76;

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
  md: 8, // = borderRadius của theme web
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const font = {
  h1: { fontSize: 24, fontWeight: '700' },
  h2: { fontSize: 20, fontWeight: '700' },
  h3: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  bodyStrong: { fontSize: 15, fontWeight: '600' },
  small: { fontSize: 13, fontWeight: '400' },
  caption: { fontSize: 11, fontWeight: '500' },
} as const;

// Đổ bóng: iOS dùng shadow*, Android dùng elevation — khai báo cả hai.
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
} as const;
