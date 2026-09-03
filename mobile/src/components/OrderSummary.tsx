// Các dòng bảng tính tiền (tạm tính / phí ship / giảm giá) và dòng tổng cộng —
// dùng chung cho màn Đặt hàng và Chi tiết đơn hàng, trước đây mỗi màn một bản chép.
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

export function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, highlight && styles.valueHi]}>{value}</Text>
    </View>
  );
}

export function GrandTotalRow({ label = 'Tổng cộng', value }: { label?: string; value: string }) {
  return (
    <View style={styles.grandRow}>
      <Text style={styles.grandLabel}>{label}</Text>
      <Text style={styles.grandValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  label: { fontSize: 13.5, color: colors.textSecondary, flexShrink: 1 },
  value: { fontSize: 13.5, color: colors.text, fontWeight: '600' },
  valueHi: { color: colors.success },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  grandLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  grandValue: { fontSize: 22, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 },
});
