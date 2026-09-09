// UC-CART-02 — Quản lý giỏ hàng (/api/cart).
//
// Giỏ nằm trên máy chủ và gắn với tài khoản, nên chưa đăng nhập là chưa có giỏ.
import { Alert, StyleSheet, Text, View, FlatList, Pressable } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import ProductThumb from '../../components/ProductThumb';
import QuantityStepper from '../../components/QuantityStepper';
import LoadState from '../../components/LoadState';
import { GrandTotalRow, SummaryRow } from '../../components/OrderSummary';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { getErrorMessage } from '../../api/client';
import { colors, radius, shadow, spacing } from '../../theme';
import { formatVND } from '../../utils/format';
import { FREE_SHIPPING_THRESHOLD } from '../../constants';
import { baseShippingFee } from '../../utils/discount';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CartScreen() {
  const navigation = useNavigation<Nav>();
  const { isAuthenticated, restoring } = useAuth();
  const {
    cart,
    updateQuantity,
    remove,
    loading,
    error,
    reload,
    selectedItems,
    selectedSubtotal,
    isSelected,
    toggleSelected,
    setAllSelected,
  } = useCart();

  // Mọi con số dưới đây tính trên các dòng ĐANG TICK, không phải cả giỏ: bỏ tick một
  // món thì tạm tính, phí ship và tổng tiền đều phải bỏ món đó ra.
  const shippingFee = baseShippingFee(selectedSubtotal);
  const freeShip = shippingFee === 0;
  const missingForFreeShip = FREE_SHIPPING_THRESHOLD - selectedSubtotal;
  const shipProgress = Math.min(1, selectedSubtotal / FREE_SHIPPING_THRESHOLD);
  const allSelected = cart.items.length > 0 && selectedItems.length === cart.items.length;

  // Mọi thao tác đều gọi API rồi tải lại giỏ — hỏng thì phải báo, không nuốt lỗi.
  const guard = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (err) {
      Alert.alert('Chưa cập nhật được giỏ hàng', getErrorMessage(err));
    }
  };

  // Lúc app còn đang khôi phục phiên (GET /users/me chưa về) thì chưa biết đã đăng
  // nhập hay chưa — hiện chờ, đừng vội chìa màn "chưa đăng nhập".
  if (restoring) {
    return (
      <Screen>
        <Header count={0} />
        <LoadState loading error={null} onRetry={reload} />
      </Screen>
    );
  }

  if (!isAuthenticated) {
    return (
      <Screen>
        <Header count={0} />
        <EmptyState
          icon="person-outline"
          title="Bạn chưa đăng nhập"
          description="Giỏ hàng gắn với tài khoản của bạn. Đăng nhập để xem và mua hàng."
          actionTitle="Đăng nhập"
          onAction={() => navigation.navigate('Login')}
        />
      </Screen>
    );
  }

  // Chỉ chiếm cả màn khi CHƯA có gì để hiện (lượt tải đầu). Các lượt reload nền sau
  // add/update/remove cũng bật `loading`, nhưng lúc đó danh sách phải đứng yên —
  // unmount list giữa chừng là mất vị trí cuộn và nuốt cú bấm stepper tiếp theo.
  if ((loading || error) && cart.items.length === 0) {
    return (
      <Screen>
        <Header count={0} />
        <LoadState loading={loading} error={error} onRetry={reload} />
      </Screen>
    );
  }

  if (cart.items.length === 0) {
    return (
      <Screen>
        <Header count={0} />
        <EmptyState
          icon="cart-outline"
          title="Giỏ hàng đang trống"
          description="Ghé xem hàng mới về, hoặc hỏi trợ lý xem nên mua gì."
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
        <View style={styles.shipRow}>
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
        <View style={styles.shipTrack}>
          <View
            style={[
              styles.shipFill,
              { width: `${shipProgress * 100}%` },
              freeShip && styles.shipFillOk,
            ]}
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: allSelected }}
        onPress={() => setAllSelected(!allSelected)}
        style={styles.selectAllRow}
      >
        <Checkbox checked={allSelected} />
        <Text style={styles.selectAllLabel}>Chọn tất cả</Text>
        <Text style={styles.selectAllCount}>
          Đã chọn {selectedItems.length}/{cart.items.length}
        </Text>
      </Pressable>

      <FlatList
        data={cart.items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        extraData={selectedItems}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={`Chọn ${item.product.name}`}
              accessibilityState={{ checked: isSelected(item.id) }}
              onPress={() => toggleSelected(item.id)}
              hitSlop={6}
              style={styles.rowCheck}
            >
              <Checkbox checked={isSelected(item.id)} />
            </Pressable>
            <View style={styles.thumbBox}>
              <ProductThumb uri={item.product.image} size={72} style={styles.thumb} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.name} numberOfLines={2}>
                {item.product.name}
              </Text>
              <Text style={styles.price}>{formatVND(item.product.price)}</Text>
              <View style={styles.rowActions}>
                <QuantityStepper
                  value={item.quantity}
                  onChange={(q) => guard(() => updateQuantity(item.id, q))}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Xoá ${item.product.name} khỏi giỏ`}
                  onPress={() => guard(() => remove(item.id))}
                  hitSlop={8}
                  style={({ pressed }) => [styles.removeBtn, pressed && styles.removeBtnPressed]}
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
        <SummaryRow label="Tạm tính" value={formatVND(selectedSubtotal)} />
        <SummaryRow
          label="Phí vận chuyển"
          value={freeShip ? 'Miễn phí' : formatVND(shippingFee)}
          highlight={freeShip}
        />
        {/* Số hiện trước cho người mua ước lượng; tiền thật do backend chốt lúc đặt
            hàng, sau khi trừ mã giảm giá chọn ở màn Đặt hàng. */}
        <GrandTotalRow value={formatVND(selectedSubtotal + shippingFee)} />
        <AppButton
          title={
            selectedItems.length > 0
              ? `Tiến hành đặt hàng (${selectedItems.length})`
              : 'Tiến hành đặt hàng'
          }
          block
          disabled={selectedItems.length === 0}
          onPress={() => navigation.navigate('Checkout')}
          style={{ marginTop: spacing.md }}
        />
      </View>
    </Screen>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.checkbox, checked && styles.checkboxOn]}>
      {checked ? <Ionicons name="checkmark" size={13} color={colors.textInverse} /> : null}
    </View>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  headerCount: { fontSize: 13, color: colors.textMuted },

  // Thanh tiến độ miễn phí ship là một thẻ nổi, không phải dải kẻ ngang suốt màn:
  // nó là thông tin của giỏ hàng này, không phải thanh trạng thái của cả trang.
  shipBar: {
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  shipBarOk: { backgroundColor: '#f0fbe8' },
  shipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  shipText: { flex: 1, fontSize: 12.5, color: colors.textSecondary, fontWeight: '600' },
  shipTrack: {
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  shipFill: { height: 5, borderRadius: radius.pill, backgroundColor: colors.primary },
  shipFillOk: { backgroundColor: colors.success },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },

  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  selectAllLabel: { flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.text },
  selectAllCount: { fontSize: 12.5, color: colors.textMuted },

  list: { padding: spacing.lg, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    ...shadow.card,
  },
  rowCheck: { padding: 2 },
  thumbBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, overflow: 'hidden' },
  thumb: { borderRadius: radius.lg },
  rowBody: { flex: 1, gap: spacing.xs },
  name: { fontSize: 13.5, color: colors.text, lineHeight: 19 },
  price: { fontSize: 15, fontWeight: '700', color: colors.primary },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  removeBtn: { padding: 6, borderRadius: radius.md },
  removeBtnPressed: { backgroundColor: colors.bg },

  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.raised,
  },
});
