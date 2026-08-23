// UC-ORDER-03 — Xem danh sách đơn hàng của tôi.
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import EmptyState from '../../components/EmptyState';
import ProductThumb from '../../components/ProductThumb';
import Tag from '../../components/Tag';
import { colors, radius, shadow, spacing } from '../../theme';
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL, formatDate, formatVND } from '../../utils/format';
import { mockOrders } from '../../mocks/data';
import type { RootStackParamList } from '../../navigation/types';
import type { OrderStatus } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FILTERS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ xử lý' },
  { key: 'paid', label: 'Đã thanh toán' },
  { key: 'shipped', label: 'Đang giao' },
  { key: 'cancelled', label: 'Đã huỷ' },
];

export default function OrdersScreen() {
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  const orders = useMemo(
    () =>
      mockOrders
        .filter((o) => filter === 'all' || o.status === filter)
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    [filter],
  );

  return (
    <Screen edges={[]}>
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="Chưa có đơn hàng nào"
            description="Các đơn ở trạng thái này sẽ hiện ra đây."
          />
        }
        renderItem={({ item }) => {
          const itemCount = item.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
          const first = item.items?.[0];
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Đơn ${item.id}, ${ORDER_STATUS_LABEL[item.status]}`}
              onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
              style={styles.card}
            >
              <View style={styles.cardHead}>
                <Text style={styles.orderId}>{item.id}</Text>
                <Tag label={ORDER_STATUS_LABEL[item.status]} color={ORDER_STATUS_COLOR[item.status]} />
              </View>

              <View style={styles.cardBody}>
                <ProductThumb uri={null} icon={first?.product?.category?.icon} size={56} />
                <View style={styles.flex}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {first?.product?.name ?? 'Sản phẩm'}
                  </Text>
                  {itemCount > (first?.quantity ?? 0) ? (
                    <Text style={styles.more}>và {itemCount - (first?.quantity ?? 0)} sản phẩm khác</Text>
                  ) : null}
                  <Text style={styles.date}>{formatDate(item.created_at)}</Text>
                </View>
              </View>

              <View style={styles.cardFoot}>
                <Text style={styles.totalLabel}>{itemCount} sản phẩm</Text>
                <View style={styles.totalRight}>
                  <Text style={styles.total}>{formatVND(item.total)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filterWrap: { backgroundColor: colors.surface, paddingVertical: spacing.md },
  filterRow: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
  },
  chipActive: { backgroundColor: colors.primarySoft },
  chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: colors.primary },

  list: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  orderId: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.2 },
  cardBody: { flexDirection: 'row', gap: spacing.md },
  productName: { fontSize: 13.5, color: colors.text, lineHeight: 19 },
  more: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  date: { fontSize: 11.5, color: colors.textMuted, marginTop: 4 },
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
  total: { fontSize: 16, fontWeight: '800', color: colors.primary },
});
