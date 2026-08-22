import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  const step = (delta: number) => {
    const next = value + delta;
    if (next >= min && next <= max) onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Giảm số lượng"
        onPress={() => step(-1)}
        disabled={value <= min}
        style={styles.btn}
      >
        <Ionicons name="remove" size={16} color={value <= min ? colors.borderStrong : colors.text} />
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tăng số lượng"
        onPress={() => step(1)}
        disabled={value >= max}
        style={styles.btn}
      >
        <Ionicons name="add" size={16} color={value >= max ? colors.borderStrong : colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  btn: { width: 32, height: 30, alignItems: 'center', justifyContent: 'center' },
  value: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: spacing.xs,
  },
});
