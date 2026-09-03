// Kết quả thanh toán khi giao dịch KHÔNG hoàn tất — thay cho trang
// /payment/payos-callback của bản web.
//
// Chỉ báo thành công khi backend xác nhận; luồng thành công đi thẳng sang màn Đặt hàng
// thành công nên ở đây chỉ còn ba trường hợp: người dùng huỷ, giao dịch thất bại, và
// chưa xác minh được. Trường hợp chưa xác minh coi như CHƯA hoàn tất cho an toàn.
import { StyleSheet, Text, View } from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import { colors, spacing, tagPalette } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'PaymentResult'>;

const OUTCOME: Record<
  RootStackParamList['PaymentResult']['outcome'],
  { icon: IoniconsIconName; color: string; soft: string; title: string; desc: string }
> = {
  cancelled: {
    icon: 'close-circle-outline',
    color: colors.warning,
    soft: tagPalette.gold.bg,
    title: 'Đã huỷ thanh toán',
    // Không hứa "thanh toán lại": backend chỉ cho tạo một giao dịch cho mỗi đơn
    // (payments.ts) — đường đi có thật là huỷ đơn trong chi tiết đơn hàng rồi đặt lại.
    desc: 'Bạn đã huỷ giao dịch, đơn hàng chưa được thanh toán. Để mua lại, vào chi tiết đơn hàng, huỷ đơn này rồi đặt đơn mới.',
  },
  failed: {
    icon: 'alert-circle-outline',
    color: colors.danger,
    soft: tagPalette.red.bg,
    title: 'Thanh toán thất bại',
    desc: 'Giao dịch không thành công, đơn hàng chưa được thanh toán. Để thử lại, vào chi tiết đơn hàng, huỷ đơn này rồi đặt đơn mới.',
  },
  unverified: {
    icon: 'help-circle-outline',
    color: colors.info,
    soft: tagPalette.blue.bg,
    title: 'Thanh toán chưa hoàn tất',
    desc: 'Nếu bạn đã thanh toán, trạng thái sẽ được cập nhật trong giây lát ở mục Đơn hàng của tôi.',
  },
};

export default function PaymentResultScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const view = OUTCOME[params.outcome];

  return (
    <Screen edges={[]}>
      <View style={styles.wrap}>
        {/* Biểu tượng đặt trong vòng tròn nền nhạt — cùng lối với màn Đặt hàng
            thành công, để ba màn kết quả trông là một bộ. */}
        <View style={[styles.iconCircle, { backgroundColor: view.soft }]}>
          <Ionicons name={view.icon} size={44} color={view.color} />
        </View>
        <Text style={styles.title}>{view.title}</Text>
        <Text style={styles.desc}>{view.desc}</Text>
        <Text style={styles.orderId}>Đơn hàng {params.orderId}</Text>

        <View style={styles.actions}>
          <AppButton
            title="Xem đơn hàng của tôi"
            block
            onPress={() => navigation.replace('Orders')}
          />
          <AppButton
            title="Tiếp tục mua sắm"
            variant="outline"
            block
            onPress={() => navigation.replace('Tabs', { screen: 'Products' })}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.4 },
  desc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  orderId: { fontSize: 12.5, color: colors.textMuted },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xl },
});
