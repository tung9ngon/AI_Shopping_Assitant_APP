import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';
import { colors, radius, spacing } from '../theme';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';

// Màn hình nào phải tự chừa chỗ cho nút (thanh hành động cố định ở đáy) thì lấy số
// này thay vì chép lại — đổi chiều cao nút ở đây là mọi nơi theo đúng.
export const BUTTON_HEIGHT = 50;

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  block,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IoniconsIconName;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  style?: ViewStyle;
}) {
  const inert = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inert, busy: !!loading }}
      onPress={inert ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyle[variant],
        // Chỉ nút nền đặc mới đổ bóng; nút viền/nền nhạt đổ bóng trông như bị nhoè.
        variant === 'primary' && !inert && styles.primaryShadow,
        block && styles.block,
        inert && styles.disabled,
        pressed && !inert && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? colors.textInverse : colors.primary} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={18} color={labelColor[variant]} /> : null}
          <Text style={[styles.label, { color: labelColor[variant] }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const labelColor: Record<Variant, string> = {
  primary: colors.textInverse,
  outline: colors.primary,
  ghost: colors.textSecondary,
  danger: colors.danger,
};

const variantStyle: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  ghost: { backgroundColor: colors.surfaceAlt },
  danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger },
};

const styles = StyleSheet.create({
  base: {
    minHeight: BUTTON_HEIGHT,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryShadow: {
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  block: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
