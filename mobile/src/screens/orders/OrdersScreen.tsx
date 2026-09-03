// UC-ORDER-03 — Xem danh sách đơn hàng của tôi (GET /api/orders).
//
// Danh sách của backend chỉ trả id, tổng tiền, trạng thái, ngày đặt và SỐ DÒNG HÀNG —
// không kèm tên hay ảnh sản phẩm, nên thẻ đơn không hiện được sản phẩm nào. Muốn xem
// hàng trong đơn phải mở chi tiết.
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import EmptyState from '../../components/EmptyState';
import LoadState from '../../components/LoadState';
import Tag from '../../components/Tag';
import Chip from '../../components/Chip';
import { orderApi } from '../../api/orders';
import { useApi } from '../../hooks/useApi';
import { colors, radius, shadow, spacing } from '../../theme';
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL, formatDate, formatVND } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';
import { getItems } from '../../types';
import type { OrderStatus } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Nhãn lấy từ ORDER_STATUS_LABEL để chip lọc luôn khớp chữ với tag trên thẻ đơn.
const FILTERS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  ...(['pending', 'paid', 'shipped', 'cancelled'] as OrderStatus[]).map((key) => ({
    key,
    label: ORDER_STATUS_LABEL[key],
  })),
];

export default function OrdersScreen() {
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  // Backend đã sắp xếp mới nhất trước và lọc theo trạng thái, app không lọc lại.
  const orders = useApi(
    () => orderApi.list({ status: filter === 'all' ? undefined : filter, limit: 50 }),
    [filter],
  );

  return (
    <Screen edges={[]}>
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              active={filter === f.key}
              onPress={() => setFilter(f.key)}
              role="tab"
            />
          ))}
        </ScrollView>
      </View>

      {orders.data ? (
        <FlatList
          data={getItems(orders.data)}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={orders.loading}
          onRefresh={orders.reload}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="Chưa có đơn hàng nào"
              description="Các đơn ở trạng thái này sẽ hiện ra đây."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Đơn ${item.id}, ${ORDER_STATUS_LABEL[item.status]}`}
              onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
              style={styles.card}
            >
              <View style={styles.cardHead}>
                {/* Mã đơn là UUID, dài quá một dòng — cắt lấy đoạn đầu như mã tra cứu. */}
                <Text style={styles.orderId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
                <Tag label={ORDER_STATUS_LABEL[item.status]} color={ORDER_STATUS_COLOR[item.status]} />
              </View>

              <Text style={styles.date}>{formatDate(item.created_at)}</Text>

              <View style={styles.cardFoot}>
                <Text style={styles.totalLabel}>{item.item_count} sản phẩm</Text>
                <View style={styles.totalRight}>
                  <Text style={styles.total}>{formatVND(item.total)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
              </View>
            </Pressable>
          )}
        />
      ) : (
        <LoadState loading={orders.loading} error={orders.error} onRetry={orders.reload} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterWrap: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    ...shadow.card,
    zIndex: 2,
  },
  filterRow: { paddingHorizontal: spacing.lg, gap: spacing.sm },

  list: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, ...shadow.card },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  orderId: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.2 },
  date: { fontSize: 11.5, color: colors.textMuted },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: { fontSize: 12.5, color: colors.textMuted },
  totalRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  total: { fontSize: 17, fontWeight: '800', color: colors.primary, letterSpacing: -0.3 },
});
