// Ô nhập mã OTP: sáu ô hiển thị, nhận ký tự qua một ô nhập trong suốt phủ lên trên.
// Bàn phím điện thoại không cho điều khiển con trỏ giữa nhiều ô rời nhau, nên gom về
// một TextInput duy nhất rồi vẽ lại thành từng ô.
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export const OTP_LENGTH = 6; // @Length(6, 6) trong auth.dto.ts

export default function OtpInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (next: string) => void;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Nhập mã xác thực"
      onPress={() => inputRef.current?.focus()}
      style={styles.row}
    >
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <View key={i} style={[styles.box, value.length === i && styles.boxActive]}>
          <Text style={styles.digit}>{value[i] ?? ''}</Text>
        </View>
      ))}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, OTP_LENGTH))}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        style={styles.hiddenInput}
        autoFocus={autoFocus}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  box: {
    flex: 1,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.primary },
  digit: { fontSize: 20, fontWeight: '700', color: colors.text },
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, fontSize: 1 },
});
