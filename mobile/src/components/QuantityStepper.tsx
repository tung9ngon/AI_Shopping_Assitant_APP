import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
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
        style={({ pressed }) => [styles.btn, pressed && value > min && styles.btnPressed]}
      >
        <Ionicons name="remove" size={16} color={value <= min ? colors.borderStrong : colors.text} />
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tăng số lượng"
        onPress={() => step(1)}
        disabled={value >= max}
        style={({ pressed }) => [styles.btn, pressed && value < max && styles.btnPressed]}
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
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  btn: { width: 38, height: 36, alignItems: 'center', justifyContent: 'center' },
  btnPressed: { backgroundColor: colors.border },
  value: {
    minWidth: 34,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: spacing.xs,
  },
});
