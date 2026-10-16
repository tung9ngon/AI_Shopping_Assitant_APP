import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';

import type { OrderListItem } from '../../api/orders';
import { colors, font, radius, spacing, tagPalette } from '../../theme';
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL, formatVND } from '../../utils/format';
import type { OrderStatus } from '../../types';

const ORDER_ICON: Partial<Record<OrderStatus, IoniconsIconName>> = {
  pending: 'receipt-outline',
  paid: 'card-outline',
  shipped: 'car-outline',
};

type Props = {
  order: OrderListItem;
  onPress: () => void;
};

// Đơn đang xử lý: lý do quay lại app của người vừa mua.
export default function ActiveOrderStrip({ order, onPress }: Props) {
  const tone = tagPalette[ORDER_STATUS_COLOR[order.status]] ?? tagPalette.default;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Đơn hàng đang ${ORDER_STATUS_LABEL[order.status]}, xem chi tiết`}
      onPress={onPress}
      style={({ pressed }) => [styles.orderStrip, pressed && styles.orderStripPressed]}
    >
      <View style={[styles.orderIcon, { backgroundColor: tone.bg }]}>
        <Ionicons name={ORDER_ICON[order.status] ?? 'receipt-outline'} size={18} color={tone.fg} />
      </View>
      <View style={styles.orderBody}>
        <Text style={styles.orderTitle} numberOfLines={1}>
          Đơn #{order.id.slice(0, 8).toUpperCase()} · {ORDER_STATUS_LABEL[order.status]}
        </Text>
        <Text style={styles.orderSub} numberOfLines={1}>
          {order.product_name ?? `${order.item_count} sản phẩm`}
        </Text>
      </View>
      <Text style={styles.orderTotal}>{formatVND(order.total)}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Thẻ gọn một dòng, cùng lề với thẻ trợ lý AI phía trên.
  orderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  orderStripPressed: { backgroundColor: colors.surfaceAlt },
  orderIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBody: { flex: 1, gap: 1 },
  orderTitle: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  orderSub: { fontSize: 12, color: colors.textMuted },
  orderTotal: { fontSize: 13.5, color: colors.ink, ...font.price },
});
