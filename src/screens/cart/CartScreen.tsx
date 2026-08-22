// UC-CART-02 — Quản lý giỏ hàng.
import { StyleSheet, Text, View, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import ProductThumb from '../../components/ProductThumb';
import QuantityStepper from '../../components/QuantityStepper';
import { useCart } from '../../context/CartContext';
import { colors, radius, shadow, spacing } from '../../theme';
import { formatVND } from '../../utils/format';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, productIcon } from '../../mocks/data';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CartScreen() {
  const navigation = useNavigation<Nav>();
  const { cart, updateQuantity, remove } = useCart();

  const freeShip = cart.subtotal >= FREE_SHIPPING_THRESHOLD;
  const missingForFreeShip = FREE_SHIPPING_THRESHOLD - cart.subtotal;

  if (cart.items.length === 0) {
    return (
      <Screen>
        <Header count={0} />
        <EmptyState
          icon="cart-outline"
          title="Giỏ hàng đang trống"
          description="Bạn chưa thêm sản phẩm nào. Ghé xem hàng mới về hoặc hỏi trợ lý AI xem nên mua gì."
          actionTitle="Xem sản phẩm"
          onAction={() => navigation.navigate('Tabs', { screen: 'Products' })}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header count={cart.items.length} />

      {/* Ngưỡng miễn phí ship — quy tắc lấy từ BE/src/users/order/order.service.ts */}
      <View style={[styles.shipBar, freeShip && styles.shipBarOk]}>
        <Ionicons
          name={freeShip ? 'checkmark-circle' : 'car-outline'}
          size={16}
          color={freeShip ? colors.success : colors.primary}
        />
        <Text style={styles.shipText}>
          {freeShip
            ? 'Đơn của bạn được miễn phí vận chuyển'
            : `Mua thêm ${formatVND(missingForFreeShip)} để được miễn phí vận chuyển`}
        </Text>
      </View>

      <FlatList
        data={cart.items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <ProductThumb uri={item.product.image} icon={productIcon(item.product.id)} size={72} />
            <View style={styles.rowBody}>
              <Text style={styles.name} numberOfLines={2}>
                {item.product.name}
              </Text>
              <Text style={styles.price}>{formatVND(item.product.price)}</Text>
              <View style={styles.rowActions}>
                <QuantityStepper
                  value={item.quantity}
                  onChange={(q) => updateQuantity(item.id, q)}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Xoá ${item.product.name} khỏi giỏ`}
                  onPress={() => remove(item.id)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      {/* ---- Thanh tổng tiền ---- */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tạm tính</Text>
          <Text style={styles.totalValue}>{formatVND(cart.subtotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Phí vận chuyển</Text>
          <Text style={styles.shipValue}>
            {freeShip ? 'Miễn phí' : formatVND(SHIPPING_FEE)}
          </Text>
        </View>
        <AppButton
          title="Tiến hành đặt hàng"
          block
          onPress={() => navigation.navigate('Checkout')}
          style={{ marginTop: spacing.md }}
        />
      </View>
    </Screen>
  );
}

function Header({ count }: { count: number }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Giỏ hàng</Text>
      {count > 0 ? <Text style={styles.headerCount}>{count} sản phẩm</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerCount: { fontSize: 13, color: colors.textMuted },

  shipBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primarySoft,
  },
  shipBarOk: { backgroundColor: '#f6ffed' },
  shipText: { flex: 1, fontSize: 12.5, color: colors.textSecondary, fontWeight: '600' },

  list: { padding: spacing.lg, gap: spacing.md },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  rowBody: { flex: 1, gap: spacing.xs },
  name: { fontSize: 13.5, color: colors.text, lineHeight: 19 },
  price: { fontSize: 15, fontWeight: '700', color: colors.primary },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },

  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.raised,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontSize: 14, color: colors.textSecondary },
  totalValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  shipValue: { fontSize: 14, fontWeight: '600', color: colors.success },
});
