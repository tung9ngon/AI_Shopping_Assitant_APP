import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { colors, spacing } from '../theme';

export default function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  // Dòng phụ nhỏ dưới tiêu đề — nói rõ băng này lấy theo tiêu chí gì ("Xếp theo
  // điểm đánh giá"), để người xem biết vì sao sản phẩm nằm ở đây.
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.titleBox}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  titleBox: { flex: 1, gap: 2 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 12.5, color: colors.textMuted },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionPressed: { opacity: 0.6 },
  actionText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
