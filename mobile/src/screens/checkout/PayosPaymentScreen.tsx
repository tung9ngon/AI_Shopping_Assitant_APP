// Thanh toán PayOS: hiện mã VietQR, mở cổng thanh toán, chờ backend xác nhận.
//
// Nguồn sự thật DUY NHẤT là GET /api/payments/:id/status. Không suy ra thành công từ
// việc người dùng bấm nút hay từ tham số cổng thanh toán trả về — chúng có thể bị giả.
//
// Giao dịch đã được tạo ở màn Đặt hàng: mã QR và link cổng thanh toán truyền sang qua
// tham số tuyến. Màn này chỉ hiển thị và hỏi trạng thái.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import { paymentApi } from '../../api/payments';
import { colors, radius, shadow, spacing } from '../../theme';
import { formatVND } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';
import type { PaymentStatus } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'PayosPayment'>;

const POLL_INTERVAL_MS = 3000;
const SUCCESS_DELAY_MS = 900; // để người dùng kịp thấy trạng thái thành công
const MAX_POLL_MS = 15 * 60 * 1000; // dừng hỏi trạng thái sau 15 phút

type UiStatus = 'pending' | 'success' | 'failed' | 'expired';

export default function PayosPaymentScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const [status, setStatus] = useState<UiStatus>('pending');
  const [checking, setChecking] = useState(false);
  // Tăng để bắt đầu lại một phiên chờ (nút "Tiếp tục chờ" sau khi đã dừng).
  const [pollSession, setPollSession] = useState(0);

  // Chốt kết quả: đảm bảo chỉ chuyển màn ĐÚNG MỘT LẦN, dù vòng poll và nút "Kiểm tra
  // ngay" cùng trả 'success' gần như đồng thời (state cập nhật bất đồng bộ).
  const settled = useRef(false);

  // Nút back Android / vuốt back iOS thoát thẳng màn QR không hỏi gì — trong khi nút
  // "Huỷ thanh toán" có xác nhận. Chặn beforeRemove để hai đường thoát cùng một luật;
  // cờ này đánh dấu các điều hướng chủ đích (đã xác nhận hoặc đã có kết quả) được đi.
  const allowLeave = useRef(false);

  useEffect(() => {
    return navigation.addListener('beforeRemove', (e) => {
      if (settled.current || allowLeave.current) return;
      e.preventDefault();
      Alert.alert('Rời màn thanh toán?', 'Đơn hàng vẫn được giữ ở trạng thái chờ thanh toán.', [
        { text: 'Tiếp tục thanh toán', style: 'cancel' },
        {
          text: 'Rời đi',
          style: 'destructive',
          onPress: () => {
            allowLeave.current = true;
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
  }, [navigation]);

  const checkStatus = useCallback(async (): Promise<PaymentStatus> => {
    const info = await paymentApi.status(params.paymentId);
    return info.status;
  }, [params.paymentId]);

  const check = useCallback(
    async (silent = true) => {
      if (settled.current) return;
      if (!silent) setChecking(true);
      try {
        const next = await checkStatus();
        if (settled.current) return;
        if (next === 'success') {
          settled.current = true;
          setStatus('success');
          setTimeout(
            () =>
              navigation.replace('OrderSuccess', {
                orderId: params.orderId,
                total: params.total,
                method: 'payos',
              }),
            SUCCESS_DELAY_MS,
          );
        } else if (next === 'failed') {
          settled.current = true;
          setStatus('failed');
        }
      } catch {
        // Lỗi tạm thời khi hỏi trạng thái — lần poll sau thử lại.
      } finally {
        if (!silent) setChecking(false);
      }
    },
    [checkStatus, navigation, params.orderId, params.total],
  );

  useEffect(() => {
    settled.current = false;
    setStatus('pending');

    const timer = setInterval(() => check(true), POLL_INTERVAL_MS);
    const expire = setTimeout(() => {
      if (settled.current) return;
      clearInterval(timer);
      setStatus('expired');
    }, MAX_POLL_MS);

    // Người dùng rời app sang ứng dụng ngân hàng rồi quay lại: hỏi trạng thái ngay,
    // không đợi hết chu kỳ poll. Đây là chỗ thay cho trang callback của bản web —
    // app không có redirect trả về nên phải tự bắt lúc quay lại.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check(true);
    });

    return () => {
      clearInterval(timer);
      clearTimeout(expire);
      sub.remove();
    };
  }, [check, pollSession]);

  const openGateway = () => {
    if (!params.paymentUrl) {
      Alert.alert(
        'Không có link thanh toán',
        'Giao dịch này không kèm link cổng thanh toán. Bạn có thể quét mã QR bằng ứng dụng ngân hàng.',
      );
      return;
    }
    Linking.openURL(params.paymentUrl).catch(() =>
      Alert.alert('Chưa mở được cổng thanh toán', 'Thiết bị không mở được link của PayOS.'),
    );
  };

  const cancel = () => {
    Alert.alert('Huỷ thanh toán', 'Đơn hàng vẫn được giữ ở trạng thái chờ thanh toán.', [
      { text: 'Tiếp tục thanh toán', style: 'cancel' },
      {
        text: 'Huỷ',
        style: 'destructive',
        onPress: () => {
          allowLeave.current = true;
          navigation.replace('PaymentResult', { orderId: params.orderId, outcome: 'cancelled' });
        },
      },
    ]);
  };

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {status === 'success' ? (
          <View style={styles.stateBox}>
            <Ionicons name="checkmark-circle" size={56} color={colors.success} />
            <Text style={styles.stateTitle}>Thanh toán thành công</Text>
            <Text style={styles.stateDesc}>Đang chuyển sang trang xác nhận đơn hàng…</Text>
          </View>
        ) : status === 'failed' ? (
          <View style={styles.stateBox}>
            <Ionicons name="close-circle" size={56} color={colors.danger} />
            <Text style={styles.stateTitle}>Thanh toán thất bại</Text>
            <Text style={styles.stateDesc}>
              Giao dịch không thành công. Đơn hàng vẫn nằm trong mục Đơn hàng của tôi.
            </Text>
            <AppButton
              title="Xem đơn hàng của tôi"
              block
              onPress={() =>
                navigation.replace('PaymentResult', { orderId: params.orderId, outcome: 'failed' })
              }
              style={styles.stateBtn}
            />
          </View>
        ) : status === 'expired' ? (
          <View style={styles.stateBox}>
            <Ionicons name="time-outline" size={56} color={colors.warning} />
            <Text style={styles.stateTitle}>Đã dừng kiểm tra tự động</Text>
            <Text style={styles.stateDesc}>
              Nếu bạn đã thanh toán, trạng thái vẫn được cập nhật trong mục Đơn hàng của tôi.
            </Text>
            <AppButton
              title="Tiếp tục chờ"
              icon="refresh"
              block
              onPress={() => setPollSession((n) => n + 1)}
              style={styles.stateBtn}
            />
            <AppButton
              title="Để sau"
              variant="ghost"
              block
              onPress={() => {
                allowLeave.current = true;
                navigation.replace('PaymentResult', {
                  orderId: params.orderId,
                  outcome: 'unverified',
                });
              }}
            />
          </View>
        ) : (
          <>
            <Text style={styles.amountLabel}>Số tiền cần thanh toán</Text>
            <Text style={styles.amount}>{formatVND(params.total)}</Text>
            <Text style={styles.orderId}>Đơn hàng {params.orderId}</Text>

            {params.qrCode ? (
              <>
                <View style={styles.qrCard}>
                  <QRCode value={params.qrCode} size={200} />
                </View>
                <Text style={styles.qrHint}>
                  Quét mã bằng ứng dụng ngân hàng trên thiết bị khác, hoặc bấm nút bên dưới để
                  thanh toán ngay trên máy này.
                </Text>
              </>
            ) : (
              <Text style={styles.qrHint}>
                Giao dịch này không có mã QR. Bấm nút bên dưới để mở cổng thanh toán.
              </Text>
            )}

            <AppButton title="Mở cổng thanh toán" icon="open-outline" block onPress={openGateway} />

            <View style={styles.waitRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.waitText}>Đang chờ xác nhận thanh toán…</Text>
            </View>

            <AppButton
              title="Kiểm tra ngay"
              variant="outline"
              icon="refresh"
              block
              loading={checking}
              onPress={() => check(false)}
            />
            <AppButton title="Huỷ thanh toán" variant="ghost" block onPress={cancel} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md, alignItems: 'stretch' },

  amountLabel: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  amount: { fontSize: 30, fontWeight: '800', color: colors.primary, textAlign: 'center', letterSpacing: -0.6 },
  orderId: { fontSize: 12.5, color: colors.textMuted, textAlign: 'center', marginTop: -spacing.sm },

  qrCard: {
    alignSelf: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginTop: spacing.sm,
    ...shadow.card,
  },
  qrHint: {
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },

  waitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  waitText: { fontSize: 13, color: colors.textSecondary },

  stateBox: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  stateTitle: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.3 },
  stateDesc: {
    fontSize: 13.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  stateBtn: { marginTop: spacing.md },
});
