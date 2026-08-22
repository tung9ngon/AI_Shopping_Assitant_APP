// Kết quả sau khi đặt hàng.
//
// Với PayOS, bản web phải hỏi lại server liên tục (polling GET /payments/:id/status).
// Trên app, thông báo đẩy sẽ báo kết quả về — nên màn hình này nêu rõ điều đó thay vì
// bắt người dùng ngồi chờ. Phần đẩy thông báo thuộc UC-MOB-01, làm ở vòng sau.
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import { colors, radius, shadow, spacing } from '../../theme';
import { formatVND } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function OrderSuccessScreen() {
  const navigation = useNavigation<Nav>();
  const { orderId, total, method } = useRoute<RouteProp<RootStackParamList, 'OrderSuccess'>>().params;

  const isPayos = method === 'payos';

  return (
    <Screen edges={[]}>
      <View style={styles.wrap}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={38} color={colors.textInverse} />
        </View>

        <Text style={styles.title}>Đã tạo đơn hàng</Text>
        <Text style={styles.desc}>
          {isPayos
            ? 'Bấm nút bên dưới để mở ứng dụng ngân hàng và hoàn tất chuyển khoản. Thanh toán xong, hệ thống sẽ báo lại cho bạn.'
            : 'Đơn của bạn đang chờ xử lý. Bạn trả tiền mặt cho người giao hàng khi nhận hàng.'}
        </Text>

        <View style={styles.card}>
          <Row label="Mã đơn hàng" value={orderId} mono />
          <Row label="Tổng thanh toán" value={formatVND(total)} strong />
          <Row
            label="Hình thức"
            value={isPayos ? 'Chuyển khoản / QR (PayOS)' : 'Thanh toán khi nhận hàng'}
          />
        </View>

        {isPayos ? (
          <View style={styles.note}>
            <Ionicons name="phone-portrait-outline" size={16} color={colors.primary} />
            <Text style={styles.noteText}>
              Trên bản web bạn phải cầm điện thoại quét mã trên màn hình máy tính. Trong app, ngân
              hàng mở thẳng — bỏ hẳn một bước.
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {isPayos ? (
            <AppButton title="Mở ứng dụng ngân hàng" icon="open-outline" block onPress={() => {}} />
          ) : null}
          <AppButton
            title="Xem đơn hàng của tôi"
            variant={isPayos ? 'outline' : 'primary'}
            block
            onPress={() => navigation.replace('Orders')}
          />
          <AppButton
            title="Tiếp tục mua sắm"
            variant="ghost"
            block
            onPress={() => navigation.navigate('Tabs', { screen: 'Home' })}
          />
        </View>
      </View>
    </Screen>
  );
}

function Row({
  label,
  value,
  strong,
  mono,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowValueStrong, mono && styles.rowValueMono]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  desc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: spacing.sm,
  },

  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    ...shadow.card,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, paddingVertical: 5 },
  rowLabel: { fontSize: 13.5, color: colors.textSecondary },
  rowValue: { fontSize: 13.5, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  rowValueStrong: { fontSize: 16, fontWeight: '800', color: colors.primary },
  rowValueMono: { fontVariant: ['tabular-nums'] },

  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  noteText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xl },
});
