// Vẽ trường `icon` của danh mục.
//
// Backend để trường này tự do, thực tế đang chứa **emoji** ('💻', '📱', '🎧'…) hoặc
// **URL ảnh** — không phải mã Ionicons. Đưa thẳng vào <Ionicons name={...}> thì thư
// viện tra glyphMap không thấy và vẽ ký tự '?' (`glyphMap[name] || '?'` trong
// @react-native-vector-icons/common). Đó là lý do lưới danh mục trước đây toàn dấu hỏi.
import { Image, StyleSheet, Text } from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';

export default function CategoryIcon({
  icon,
  size,
  color,
  fallback = 'cube-outline',
}: {
  icon?: string | null;
  size: number;
  /** Chỉ áp cho glyph Ionicons dự phòng; emoji và ảnh tự mang màu của nó. */
  color: string;
  fallback?: IoniconsIconName;
}) {
  const value = icon?.trim();

  if (!value) {
    return <Ionicons name={fallback} size={size} color={color} />;
  }

  if (/^https?:\/\//i.test(value)) {
    return (
      <Image source={{ uri: value }} style={{ width: size, height: size }} resizeMode="contain" />
    );
  }

  // lineHeight rộng hơn cỡ chữ: emoji cao hơn chữ thường, để mặc định sẽ bị cắt đỉnh.
  return (
    <Text style={[styles.emoji, { fontSize: size, lineHeight: size * 1.3 }]} numberOfLines={1}>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  emoji: { textAlign: 'center' },
});
