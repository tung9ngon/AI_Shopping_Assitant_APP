// Ảnh sản phẩm.
//
// Backend lưu ảnh trên Cloudinary; dữ liệu mẫu của vòng dựng giao diện chưa có ảnh thật
// nên hiển thị ảnh thay thế mang nhận diện cửa hàng: nền pha màu theo danh mục kèm
// glyph tương ứng. Khi đấu API thật, truyền `uri` vào là tự chuyển sang ảnh thật.
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  style?: object;
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
      <Ionicons
        name={key as keyof typeof Ionicons.glyphMap}
        size={size * 0.42}
        color={CATEGORY_FG[key] ?? colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
