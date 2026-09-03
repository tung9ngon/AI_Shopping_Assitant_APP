import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';
import { colors, radius, spacing } from '../theme';

export default function TextField({
  label,
  icon,
  error,
  style,
  ...rest
}: TextInputProps & {
  label?: string;
  icon?: IoniconsIconName;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.box,
          focused && styles.boxFocused,
          !!error && styles.boxError,
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={colors.textMuted} /> : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          {...rest}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
        />
      </View>
      {/* liveRegion: TalkBack đọc lỗi ngay khi nó xuất hiện, không chỉ hiện thị giác */}
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginLeft: 2 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  // Đang gõ thì ô sáng lên (nền trắng) chứ không chỉ đổi màu viền — viền 1px trên
  // màn hình điện thoại là tín hiệu quá nhỏ.
  boxFocused: { borderColor: colors.primary, backgroundColor: colors.surface },
  boxError: { borderColor: colors.danger },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: spacing.sm },
  error: { fontSize: 12, color: colors.danger, marginLeft: 2 },
});
