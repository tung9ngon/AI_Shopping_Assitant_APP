// UC-ORDER-04 — Xem chi tiết đơn hàng (GET /api/orders/:id).
// UC-ORDER-05 — Huỷ đơn hàng (PUT /api/orders/:id/cancel, chỉ khi đơn đang ở pending
// hoặc simulated_success — backend cũng chặn lại nếu đơn đã được xử lý).
//
// Địa chỉ giao hàng lấy từ chính đơn (backend chép lại lúc đặt), không tra sổ địa chỉ:
// sửa hay xoá địa chỉ về sau không được làm đổi đơn đã đặt.
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import { GrandTotalRow, SummaryRow } from '../../components/OrderSummary';
import LoadState from '../../components/LoadState';
import ProductThumb from '../../components/ProductThumb';
import Tag from '../../components/Tag';
import { orderApi } from '../../api/orders';
import { getErrorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { colors, radius, spacing, tagPalette } from '../../theme';
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL, formatDate, formatVND } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';
import type { OrderStatus } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Ràng buộc lấy từ backend: chỉ hai trạng thái này mới huỷ được.
const CANCELLABLE: OrderStatus[] = ['pending', 'simulated_success'];

// Các mốc theo dõi đơn, khớp chuỗi trạng thái pending → paid → shipped.
const TIMELINE: { status: OrderStatus; label: string; icon: IoniconsIconName }[] = [
  { status: 'pending', label: 'Đã đặt hàng', icon: 'receipt-outline' },
  { status: 'paid', label: 'Đã thanh toán', icon: 'card-outline' },
  { status: 'shipped', label: 'Đang giao hàng', icon: 'car-outline' },
];

export default function OrderDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { orderId } = useRoute<RouteProp<RootStackParamList, 'OrderDetail'>>().params;
  const { data: order, loading, error, reload } = useApi(() => orderApi.detail(orderId), [orderId]);
  const [cancelling, setCancelling] = useState(false);

  if (!order) {
    return (
      <Screen edges={[]}>
        <LoadState loading={loading} error={error} onRetry={reload} />
      </Screen>
    );
  }

  const status = order.status;
  const reachedIndex = TIMELINE.findIndex((t) => t.status === status);
  const address = order.shipping_address;

  const cancel = async () => {
    setCancelling(true);
    try {
      await orderApi.cancel(order.id);
      reload();
    } catch (err) {
      Alert.alert('Không huỷ được đơn', getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const confirmCancel = () => {
    Alert.alert('Huỷ đơn hàng', `Bạn chắc chắn muốn huỷ đơn #${order.id.slice(0, 8).toUpperCase()}?`, [
      { text: 'Không', style: 'cancel' },
      { text: 'Huỷ đơn', style: 'destructive', onPress: cancel },
    ]);
  };

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ---- Trạng thái ---- */}
        <Card style={styles.card}>
          <View style={styles.statusHead}>
            <View style={styles.flex}>
              <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
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
        <Card title={`Sản phẩm (${order.items.length})`} style={styles.card}>
          {order.items.map((item, i) => (
            <View key={item.product.id} style={[styles.itemRow, i > 0 && styles.itemRowBorder]}>
              <ProductThumb uri={item.product.image} icon={null} size={52} />
              <View style={styles.flex}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product.name}
                </Text>
                {/* Backend trả giá HIỆN TẠI của sản phẩm, không phải giá lúc đặt. */}
                <Text style={styles.itemQty}>
                  {formatVND(item.product.price)} × {item.quantity}
                </Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemTotal}>{formatVND(item.product.price * item.quantity)}</Text>
                {/* Backend chỉ cho đánh giá sản phẩm trong đơn đã hoàn tất (status 'paid'). */}
                {status === 'paid' ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      navigation.navigate('WriteReview', {
                        productId: item.product.id,
                        productName: item.product.name,
                        productImage: item.product.image,
                      })
                    }
                    hitSlop={6}
                    style={styles.reviewLink}
                  >
                    <Ionicons name="create-outline" size={13} color={colors.primary} />
                    <Text style={styles.reviewLinkText}>Đánh giá</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </Card>

        {/* ---- Thanh toán ---- */}
        {/* Hình thức và trạng thái thanh toán không hiện được: GET /api/orders/:id
            không trả kèm thông tin giao dịch. */}
        <Card title="Thanh toán" style={styles.card}>
          <SummaryRow label="Tạm tính" value={formatVND(order.subtotal)} />
          <SummaryRow
            label="Phí vận chuyển"
            value={order.shipping_fee === 0 ? 'Miễn phí' : formatVND(order.shipping_fee)}
          />
          {order.discount_amount > 0 ? (
            <SummaryRow label="Giảm giá" value={`- ${formatVND(order.discount_amount)}`} highlight />
          ) : null}
          {order.shipping_discount_amount > 0 ? (
            <SummaryRow
              label="Giảm phí ship"
              value={`- ${formatVND(order.shipping_discount_amount)}`}
              highlight
            />
          ) : null}
          <GrandTotalRow value={formatVND(order.total)} />
        </Card>

        {CANCELLABLE.includes(status) ? (
          <AppButton
            title="Huỷ đơn hàng"
            variant="danger"
            block
            loading={cancelling}
            onPress={confirmCancel}
            style={styles.cancelBtn}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
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
    width: 34,
    height: 34,
    borderRadius: 17,
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
    borderRadius: radius.lg,
    backgroundColor: tagPalette.red.bg,
  },
  cancelledText: { flex: 1, fontSize: 12.5, color: colors.textSecondary },

  addrName: { fontSize: 14, fontWeight: '700', color: colors.text },
  addrText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginTop: 3 },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  itemName: { fontSize: 13, color: colors.text, lineHeight: 18 },
  itemRight: { alignItems: 'flex-end', gap: spacing.xs },
  reviewLink: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reviewLinkText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  itemQty: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  itemTotal: { fontSize: 13.5, fontWeight: '700', color: colors.text },


  cancelBtn: { marginTop: spacing.sm },
});
