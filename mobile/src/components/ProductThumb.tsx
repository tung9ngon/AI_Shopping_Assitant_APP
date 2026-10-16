// Ảnh sản phẩm.
//
// Backend lưu ảnh trên Cloudinary. Sản phẩm chưa có ảnh (hoặc endpoint không trả ảnh)
// thì vẽ ảnh thay thế trung tính: nền giấy nhạt kèm glyph theo tên danh mục (xem
// CategoryIcon) — không pha màu theo danh mục nữa, vài ô cầu vồng giữa lưới ảnh thật
// trông như hàng mẫu.
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

export default function ProductThumb({
  uri,
  icon,
  categoryName,
  size,
  style,
}: {
  uri?: string | null;
  icon?: string | null;
  categoryName?: string | null;
  size: number;
  // Áp cho cả nhánh Image lẫn nhánh placeholder (View) — giao của hai kiểu style.
  style?: StyleProp<ImageStyle & ViewStyle>;
}) {
  const box = { width: size, height: size, borderRadius: radius.lg };

  if (uri) {
    return <Image source={{ uri }} style={[box, styles.image, style]} resizeMode="cover" />;
  }

  return (
    <View style={[box, styles.placeholder, style]}>
      <CategoryIcon
        name={categoryName}
        icon={icon}
        size={size * 0.38}
        color={colors.borderStrong}
        fallback="hardware-chip-outline"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Ảnh sản phẩm thường nền trắng — nền giấy nhạt phía sau giữ được mép ảnh khi
  // ảnh chưa tải xong hoặc có viền trong suốt.
  image: { backgroundColor: colors.surfaceAlt },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
});
