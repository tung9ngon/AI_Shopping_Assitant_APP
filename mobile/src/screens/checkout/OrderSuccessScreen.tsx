// Kết quả sau khi đặt hàng.
//
// COD: đến thẳng từ Checkout sau khi tạo đơn. PayOS: chỉ đến được từ PayosPaymentScreen
// SAU KHI backend xác nhận đã thanh toán xong — nên nhánh PayOS ở đây là "đã trả tiền",
// không được nhắc người dùng đi chuyển khoản nữa.
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import Gradient from '../../components/Gradient';
import { colors, gradient, radius, shadow, spacing } from '../../theme';
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
        <Gradient colors={gradient.success} style={styles.iconCircle}>
          <Ionicons name="checkmark" size={40} color={colors.textInverse} />
        </Gradient>

        <Text style={styles.title}>{isPayos ? 'Thanh toán thành công' : 'Đã tạo đơn hàng'}</Text>
        <Text style={styles.desc}>
          {isPayos
            ? 'Đơn hàng đã được thanh toán qua PayOS. Chúng tôi sẽ chuẩn bị và giao hàng cho bạn sớm nhất.'
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

        <View style={styles.actions}>
          <AppButton
            title="Xem đơn hàng của tôi"
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
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#389e0d',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
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
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.xl,
    ...shadow.card,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, paddingVertical: 5 },
  rowLabel: { fontSize: 13.5, color: colors.textSecondary },
  rowValue: { fontSize: 13.5, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  rowValueStrong: { fontSize: 16, fontWeight: '800', color: colors.primary },
  rowValueMono: { fontVariant: ['tabular-nums'] },

  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xl },
});
