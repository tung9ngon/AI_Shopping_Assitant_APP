import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { colors, spacing } from '../theme';

export default function Rating({
  value,
  count,
  size = 13,
}: {
  value: string | number | null;
  count?: number;
  size?: number;
}) {
  const score = Number(value ?? 0);
  if (!score) {
    return <Text style={[styles.muted, { fontSize: size }]}>Chưa có đánh giá</Text>;
  }
  return (
    <View style={styles.row}>
      <Ionicons name="star" size={size} color={colors.warning} />
      <Text style={[styles.score, { fontSize: size }]}>{score.toFixed(1)}</Text>
      {count != null ? <Text style={[styles.muted, { fontSize: size }]}>({count})</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  score: { fontWeight: '600', color: colors.text },
  muted: { color: colors.textMuted },
});
