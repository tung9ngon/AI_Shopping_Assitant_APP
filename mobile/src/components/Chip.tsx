// Chip lọc dạng viên thuốc — đang chọn thì tô gradient cam đặc chứ không phải nền
// cam nhạt: hàng chip cuộn ngang, liếc qua phải thấy ngay đang đứng ở mục nào.
// Dùng chung cho hàng danh mục ở màn Sản phẩm và hàng trạng thái ở màn Đơn hàng.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Gradient from './Gradient';
import { colors, gradient, radius, spacing } from '../theme';

export default function Chip({
  label,
  active,
  onPress,
  role = 'button',
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  role?: 'button' | 'tab';
}) {
  const content = <Text style={[styles.text, active && styles.textActive]}>{label}</Text>;

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      {active ? (
        // Nền chuyển sắc nên không có viền: viền đi kèm sẽ cắt ngang dải màu.
        <Gradient colors={gradient.brand} style={styles.pill}>
          {content}
        </Gradient>
      ) : (
        <View style={[styles.pill, styles.idle]}>{content}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.pill },
  pill: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  idle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.8 },
  text: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  textActive: { color: colors.textInverse },
});
