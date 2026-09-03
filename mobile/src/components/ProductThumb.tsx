// Ảnh sản phẩm.
//
// Backend lưu ảnh trên Cloudinary. Sản phẩm chưa có ảnh (hoặc endpoint không trả ảnh)
// thì vẽ ảnh thay thế mang nhận diện cửa hàng: nền pha màu theo danh mục kèm biểu tượng
// tương ứng — truyền `icon` là trường `icon` của danh mục (emoji hoặc URL, xem
// CategoryIcon), không có thì rơi về glyph chung.
import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import CategoryIcon from './CategoryIcon';
import { colors, radius } from '../theme';

const CATEGORY_TINT: Record<string, string> = {
  'laptop-outline': '#eef4ff',
  'phone-portrait-outline': '#fff3ec',
  'watch-outline': '#f0fff4',
  'headset-outline': '#f9f0ff',
  'tablet-landscape-outline': '#e6fffb',
  'hardware-chip-outline': '#fffbe6',
};

const CATEGORY_FG: Record<string, string> = {
  'laptop-outline': '#4f7cff',
  'phone-portrait-outline': colors.primary,
  'watch-outline': '#3aa76d',
  'headset-outline': '#8a4fdb',
  'tablet-landscape-outline': '#0f9b93',
  'hardware-chip-outline': '#d99106',
};

export default function ProductThumb({
  uri,
  icon,
  size,
  style,
}: {
  uri?: string | null;
  icon?: string | null;
  size: number;
  // Áp cho cả nhánh Image lẫn nhánh placeholder (View) — giao của hai kiểu style.
  style?: StyleProp<ImageStyle & ViewStyle>;
}) {
  const box = { width: size, height: size, borderRadius: radius.lg };

  if (uri) {
    return <Image source={{ uri }} style={[box, style]} resizeMode="cover" />;
  }

  const key = icon ?? 'hardware-chip-outline';
  return (
    <View
      style={[
        box,
        styles.placeholder,
        { backgroundColor: CATEGORY_TINT[key] ?? colors.surfaceAlt },
        style,
      ]}
    >
      <CategoryIcon
        icon={icon}
        size={size * 0.42}
        color={CATEGORY_FG[key] ?? colors.textMuted}
        fallback="hardware-chip-outline"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
