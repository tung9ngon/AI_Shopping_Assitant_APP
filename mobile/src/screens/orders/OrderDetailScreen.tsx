// UC-ORDER-04 — Xem chi tiết đơn hàng.
// UC-ORDER-05 — Huỷ đơn hàng (chỉ khi đơn đang ở pending hoặc simulated_success).
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import ProductThumb from '../../components/ProductThumb';
import Tag from '../../components/Tag';
import { colors, radius, spacing } from '../../theme';
import {
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  formatDate,
  formatVND,
} from '../../utils/format';
import { mockAddresses, mockOrders } from '../../mocks/data';
import type { RootStackParamList } from '../../navigation/types';
import type { OrderStatus } from '../../types';

// Ràng buộc lấy từ backend: chỉ hai trạng thái này mới huỷ được.
const CANCELLABLE: OrderStatus[] = ['pending', 'simulated_success'];

// Các mốc theo dõi đơn, khớp chuỗi trạng thái pending → paid → shipped.
const TIMELINE: { status: OrderStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { status: 'pending', label: 'Đã đặt hàng', icon: 'receipt-outline' },
  { status: 'paid', label: 'Đã thanh toán', icon: 'card-outline' },
  { status: 'shipped', label: 'Đang giao hàng', icon: 'car-outline' },
];

export default function OrderDetailScreen() {
  const { orderId } = useRoute<RouteProp<RootStackParamList, 'OrderDetail'>>().params;
  const order = useMemo(() => mockOrders.find((o) => o.id === orderId), [orderId]);
  const [cancelled, setCancelled] = useState(false);

  if (!order) {
    return (
      <Screen edges={[]}>
        <Text style={styles.notFound}>Không tìm thấy đơn hàng.</Text>
      </Screen>
    );
  }

  const status = cancelled ? 'cancelled' : order.status;
  const reachedIndex = TIMELINE.findIndex((t) => t.status === status);
  const address = mockAddresses.find((a) => a.is_default) ?? mockAddresses[0];

  const confirmCancel = () => {
    Alert.alert('Huỷ đơn hàng', `Bạn chắc chắn muốn huỷ đơn ${order.id}?`, [
      { text: 'Không', style: 'cancel' },
      { text: 'Huỷ đơn', style: 'destructive', onPress: () => setCancelled(true) },
    ]);
  };

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ---- Trạng thái ---- */}
        <Card style={styles.card}>
          <View style={styles.statusHead}>
            <View style={styles.flex}>
              <Text style={styles.orderId}>{order.id}</Text>
              <Text style={styles.date}>Đặt lúc {formatDate(order.created_at)}</Text>
            </View>
            <Tag label={ORDER_STATUS_LABEL[status]} color={ORDER_STATUS_COLOR[status]} />
          </View>

          {status !== 'cancelled' ? (
            <View style={styles.timeline}>
              {TIMELINE.map((step, i) => {
                const done = i <= reachedIndex;
                return (
                  <View key={step.status} style={styles.step}>
                    <View style={styles.stepIconWrap}>
                      {i > 0 ? <View style={[styles.stepLine, done && styles.stepLineDone]} /> : null}
                      <View style={[styles.stepIcon, done && styles.stepIconDone]}>
                        <Ionicons
                          name={step.icon}
                          size={15}
                          color={done ? colors.textInverse : colors.textMuted}
                        />
                      </View>
                    </View>
                    <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step.label}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.cancelledNote}>
              <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.cancelledText}>
                Đơn đã huỷ{order.note ? ` — ${order.note}` : ''}
              </Text>
            </View>
          )}
        </Card>

        {/* ---- Địa chỉ nhận hàng ---- */}
        <Card title="Địa chỉ nhận hàng" style={styles.card}>
          <Text style={styles.addrName}>
            {address.recipient_name} · {address.phone_number}
          </Text>
          <Text style={styles.addrText}>{address.full_address}</Text>
        </Card>

        {/* ---- Sản phẩm ---- */}
        <Card title={`Sản phẩm (${order.items?.length ?? 0})`} style={styles.card}>
          {order.items?.map((item, i) => (
            <View key={item.id} style={[styles.itemRow, i > 0 && styles.itemRowBorder]}>
              <ProductThumb uri={null} icon={item.product?.category?.icon} size={52} />
              <View style={styles.flex}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product?.name ?? 'Sản phẩm'}
                </Text>
                <Text style={styles.itemQty}>
                  {formatVND(item.unit_price)} × {item.quantity}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatVND(item.unit_price * item.quantity)}</Text>
            </View>
          ))}
        </Card>

        {/* ---- Thanh toán ---- */}
        <Card title="Thanh toán" style={styles.card}>
          {order.payment ? (
            <View style={styles.payHead}>
              <Text style={styles.payMethod}>
                {order.payment.method === 'payos' ? 'Chuyển khoản / QR (PayOS)' : 'Thanh toán khi nhận hàng'}
              </Text>
              <Tag
                label={PAYMENT_STATUS_LABEL[order.payment.status]}
                color={PAYMENT_STATUS_COLOR[order.payment.status]}
              />
            </View>
          ) : null}

          <SummaryRow label="Tạm tính" value={formatVND(order.subtotal)} />
          <SummaryRow
            label="Phí vận chuyển"
            value={order.shipping_fee === 0 ? 'Miễn phí' : formatVND(order.shipping_fee)}
          />
          {order.discount_amount > 0 ? (
            <SummaryRow label="Giảm giá" value={`- ${formatVND(order.discount_amount)}`} highlight />
          ) : null}
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Tổng cộng</Text>
            <Text style={styles.grandValue}>{formatVND(order.total)}</Text>
          </View>
        </Card>

        {CANCELLABLE.includes(status) ? (
          <AppButton
            title="Huỷ đơn hàng"
            variant="danger"
            block
            onPress={confirmCancel}
            style={styles.cancelBtn}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.summaryValueHi]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  notFound: { padding: spacing.xl, color: colors.textMuted },
  card: { marginTop: 0 },

  statusHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  orderId: { fontSize: 14, fontWeight: '700', color: colors.text },
  date: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  timeline: { flexDirection: 'row', marginTop: spacing.xl },
  step: { flex: 1, alignItems: 'center', gap: spacing.sm },
  stepIconWrap: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  stepLine: {
    position: 'absolute',
    right: '50%',
    width: '100%',
    height: 2,
    backgroundColor: colors.border,
  },
  stepLineDone: { backgroundColor: colors.primary },
  stepIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconDone: { backgroundColor: colors.primary },
  stepLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  stepLabelDone: { color: colors.text, fontWeight: '600' },

  cancelledNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#fff1f0',
  },
  cancelledText: { flex: 1, fontSize: 12.5, color: colors.textSecondary },

  addrName: { fontSize: 14, fontWeight: '700', color: colors.text },
  addrText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginTop: 3 },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  itemName: { fontSize: 13, color: colors.text, lineHeight: 18 },
  itemQty: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  itemTotal: { fontSize: 13.5, fontWeight: '700', color: colors.text },

  payHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  payMethod: { flex: 1, fontSize: 13.5, color: colors.text, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 13.5, color: colors.textSecondary },
  summaryValue: { fontSize: 13.5, color: colors.text, fontWeight: '600' },
  summaryValueHi: { color: colors.success },
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
  grandValue: { fontSize: 19, fontWeight: '800', color: colors.primary },

  cancelBtn: { marginTop: spacing.sm },
});
