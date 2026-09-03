// Chỉ báo bước cho các luồng nhiều bước (đăng ký, quên mật khẩu) — trước đây khối
// này bị chép nguyên văn ở cả hai màn.
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { colors, spacing } from '../theme';

export default function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View style={styles.stepper}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={label} style={styles.stepItem}>
            {i > 0 ? <View style={[styles.stepLine, i <= current && styles.stepLineDone]} /> : null}
            <View style={[styles.stepDot, (done || active) && styles.stepDotActive]}>
              {done ? (
                <Ionicons name="checkmark" size={13} color={colors.textInverse} />
              ) : (
                <Text style={[styles.stepNum, active && styles.stepNumActive]}>{i + 1}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', marginBottom: spacing.xl },
  stepItem: { flex: 1, alignItems: 'center', gap: spacing.sm },
  stepLine: {
    position: 'absolute',
    right: '50%',
    top: 14,
    width: '100%',
    height: 2,
    backgroundColor: colors.border,
  },
  stepLineDone: { backgroundColor: colors.primary },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepNum: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  stepNumActive: { color: colors.textInverse },
  stepLabel: { fontSize: 11, color: colors.textMuted },
  stepLabelActive: { color: colors.text, fontWeight: '600' },
});
