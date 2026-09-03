// Nhãn trạng thái. utils/format.ts (copy từ web) trả về tên màu của Ant Design —
// tagPalette trong theme ánh xạ tên đó sang cặp nền/chữ dùng được trên React Native.
import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing, tagPalette } from '../theme';

export default function Tag({ label, color = 'default' }: { label: string; color?: string }) {
  const palette = tagPalette[color] ?? tagPalette.default;
  return (
    <View style={[styles.wrap, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600' },
});
