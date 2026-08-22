import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';

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
  icon?: keyof typeof Ionicons.glyphMap;
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
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
});
