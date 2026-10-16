// Chip lọc dạng viên thuốc — đang chọn thì tô đặc màu mực chứ không phải nền nhạt:
// hàng chip cuộn ngang, liếc qua phải thấy ngay đang đứng ở mục nào.
// Dùng chung cho hàng danh mục ở màn Sản phẩm và hàng trạng thái ở màn Đơn hàng.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

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
      <View style={[styles.pill, active ? styles.active : styles.idle]}>{content}</View>
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
  // Cùng độ dày viền ở cả hai trạng thái để chip không xê dịch khi chọn.
  idle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: {
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  pressed: { opacity: 0.8 },
  text: { fontSize: 13, color: colors.text, fontWeight: '600' },
  textActive: { color: colors.textInverse },
});
