// UC-ORDER-01 — Đặt hàng từ giỏ hàng.
// UC-PAY-01 / UC-PAY-02 — Chọn hình thức thanh toán (PayOS hoặc COD).
//
// Quy tắc tính tiền lấy đúng theo BE/src/users/order/order.service.ts:
//   phí ship 30.000đ, miễn phí khi tạm tính từ 500.000đ;
//   một đơn áp tối đa 2 mã — 1 mã giảm tiền hàng + 1 mã miễn phí ship.
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import ProductThumb from '../../components/ProductThumb';
import { useCart } from '../../context/CartContext';
import { colors, radius, shadow, spacing } from '../../theme';
import { formatVND } from '../../utils/format';
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  mockAddresses,
  mockVouchers,
  productIcon,
} from '../../mocks/data';
import type { RootStackParamList } from '../../navigation/types';
import type { DiscountCode, PaymentMethod } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Tính số tiền được giảm của một mã, theo đúng loại percent / fixed_amount và trần max_discount.
export function computeDiscount(voucher: DiscountCode | null, base: number): number {
  if (!voucher) return 0;
  if (voucher.min_order_value && base < voucher.min_order_value) return 0;
  const raw =
    voucher.discount_type === 'percent'
      ? (base * voucher.discount_value) / 100
      : voucher.discount_value;
  const capped = voucher.max_discount ? Math.min(raw, voucher.max_discount) : raw;
  return Math.round(Math.min(capped, base));
}

const PAYMENT_OPTIONS: {
  method: PaymentMethod;
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    method: 'payos',
    title: 'Chuyển khoản / quét QR (PayOS)',
    desc: 'Mở thẳng ứng dụng ngân hàng trên máy, không phải quét màn hình như bản web',
    icon: 'qr-code-outline',
  },
  {
    method: 'cod',
    title: 'Thanh toán khi nhận hàng',
    desc: 'Trả tiền mặt cho người giao hàng',
    icon: 'cash-outline',
  },
];

export default function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'Checkout'>>();
  const { cart, clear } = useCart();

  const [addressId, setAddressId] = useState(
    mockAddresses.find((a) => a.is_default)?.id ?? mockAddresses[0].id,
  );
  const [addressOpen, setAddressOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('payos');
  const [orderVoucherId, setOrderVoucherId] = useState<string | null>(null);
  const [shipVoucherId, setShipVoucherId] = useState<string | null>(null);

  // Nhận kết quả từ màn hình chọn mã.
  useEffect(() => {
    if (route.params?.orderVoucherId !== undefined) setOrderVoucherId(route.params.orderVoucherId);
    if (route.params?.shipVoucherId !== undefined) setShipVoucherId(route.params.shipVoucherId);
  }, [route.params]);

  const address = mockAddresses.find((a) => a.id === addressId)!;
  const orderVoucher = mockVouchers.find((v) => v.id === orderVoucherId) ?? null;
  const shipVoucher = mockVouchers.find((v) => v.id === shipVoucherId) ?? null;

  const totals = useMemo(() => {
    const subtotal = cart.subtotal;
    const baseShipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const orderDiscount = computeDiscount(orderVoucher, subtotal);
    const shipDiscount = Math.min(computeDiscount(shipVoucher, subtotal), baseShipping);
    return {
      subtotal,
      baseShipping,
      orderDiscount,
      shipDiscount,
      total: Math.max(0, subtotal - orderDiscount + baseShipping - shipDiscount),
    };
  }, [cart.subtotal, orderVoucher, shipVoucher]);

  const voucherCount = (orderVoucher ? 1 : 0) + (shipVoucher ? 1 : 0);

  const placeOrder = () => {
    const orderId = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(
      Math.floor(Math.random() * 9000) + 1000,
    )}`;
    clear();
    navigation.replace('OrderSuccess', { orderId, total: totals.total, method });
  };

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ---- Địa chỉ giao hàng ---- */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đổi địa chỉ giao hàng"
          onPress={() => setAddressOpen(true)}
          style={styles.addressCard}
        >
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <View style={styles.flex}>
            <Text style={styles.addressName}>
              {address.recipient_name} · {address.phone_number}
            </Text>
            <Text style={styles.addressText}>{address.full_address}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        {/* ---- Sản phẩm ---- */}
        <Card title={`Sản phẩm (${cart.items.length})`} style={styles.card}>
          {cart.items.map((item, i) => (
            <View key={item.id} style={[styles.itemRow, i > 0 && styles.itemRowBorder]}>
              <ProductThumb uri={item.product.image} icon={productIcon(item.product.id)} size={48} />
              <View style={styles.flex}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product.name}
                </Text>
                <Text style={styles.itemQty}>Số lượng: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>
                {formatVND(Number(item.product.price) * item.quantity)}
              </Text>
            </View>
          ))}
        </Card>

        {/* ---- UC-ORDER-02: chọn mã giảm giá ---- */}
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate('VoucherPicker', {
              subtotal: cart.subtotal,
              orderVoucherId,
              shipVoucherId,
            })
          }
          style={styles.voucherRow}
        >
          <Ionicons name="pricetags-outline" size={20} color={colors.primary} />
          <Text style={styles.voucherLabel}>Mã giảm giá</Text>
          <Text style={styles.voucherValue}>
            {voucherCount > 0 ? `Đã chọn ${voucherCount} mã` : 'Chọn mã'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        {/* ---- Hình thức thanh toán ---- */}
        <Card title="Hình thức thanh toán" style={styles.card}>
          {PAYMENT_OPTIONS.map((opt) => {
            const active = method === opt.method;
            return (
              <Pressable
                key={opt.method}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setMethod(opt.method)}
                style={[styles.payOption, active && styles.payOptionActive]}
              >
                <Ionicons name={opt.icon} size={22} color={active ? colors.primary : colors.textMuted} />
                <View style={styles.flex}>
                  <Text style={[styles.payTitle, active && styles.payTitleActive]}>{opt.title}</Text>
                  <Text style={styles.payDesc}>{opt.desc}</Text>
                </View>
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={active ? colors.primary : colors.borderStrong}
                />
              </Pressable>
            );
          })}
        </Card>

        {/* ---- Tổng tiền ---- */}
        <Card title="Chi tiết thanh toán" style={styles.card}>
          <SummaryRow label="Tạm tính" value={formatVND(totals.subtotal)} />
          <SummaryRow
            label="Phí vận chuyển"
            value={totals.baseShipping === 0 ? 'Miễn phí' : formatVND(totals.baseShipping)}
          />
          {totals.orderDiscount > 0 ? (
            <SummaryRow
              label={`Giảm giá (${orderVoucher?.code})`}
              value={`- ${formatVND(totals.orderDiscount)}`}
              highlight
            />
          ) : null}
          {totals.shipDiscount > 0 ? (
            <SummaryRow
              label={`Giảm phí ship (${shipVoucher?.code})`}
              value={`- ${formatVND(totals.shipDiscount)}`}
              highlight
            />
          ) : null}
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Tổng cộng</Text>
            <Text style={styles.grandValue}>{formatVND(totals.total)}</Text>
          </View>
        </Card>
      </ScrollView>

      {/* ---- Thanh đặt hàng ---- */}
      <View style={styles.footer}>
        <View style={styles.flex}>
          <Text style={styles.footerLabel}>Tổng thanh toán</Text>
          <Text style={styles.footerTotal}>{formatVND(totals.total)}</Text>
        </View>
        <AppButton
          title="Đặt hàng"
          onPress={placeOrder}
          disabled={cart.items.length === 0}
          style={styles.placeBtn}
        />
      </View>

      {/* ---- Sổ địa chỉ ---- */}
      <Modal visible={addressOpen} transparent animationType="slide" onRequestClose={() => setAddressOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAddressOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Chọn địa chỉ giao hàng</Text>
          {mockAddresses.map((a) => {
            const active = a.id === addressId;
            return (
              <Pressable
                key={a.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setAddressId(a.id);
                  setAddressOpen(false);
                }}
                style={[styles.addressOption, active && styles.addressOptionActive]}
              >
                <View style={styles.flex}>
                  <View style={styles.addressHeadRow}>
                    <Text style={styles.addressName}>{a.recipient_name}</Text>
                    {a.is_default ? (
                      <View style={styles.defaultTag}>
                        <Text style={styles.defaultTagText}>Mặc định</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.addressText}>{a.phone_number}</Text>
                  <Text style={styles.addressText}>{a.full_address}</Text>
                </View>
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={active ? colors.primary : colors.borderStrong}
                />
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </Screen>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.summaryValueHi]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: 120, gap: spacing.md },

  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  addressHeadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addressName: { fontSize: 14, fontWeight: '700', color: colors.text },
  addressText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginTop: 2 },
  defaultTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  defaultTagText: { fontSize: 10.5, fontWeight: '700', color: colors.primary },

  card: { marginTop: 0 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  itemName: { fontSize: 13, color: colors.text, lineHeight: 18 },
  itemQty: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 13.5, fontWeight: '700', color: colors.text },

  voucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  voucherLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  voucherValue: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  payOptionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  payTitle: { fontSize: 13.5, fontWeight: '600', color: colors.text },
  payTitleActive: { color: colors.primary },
  payDesc: { fontSize: 11.5, color: colors.textMuted, lineHeight: 16, marginTop: 2 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 13.5, color: colors.textSecondary, flexShrink: 1 },
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
  grandValue: { fontSize: 20, fontWeight: '800', color: colors.primary },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.raised,
  },
  footerLabel: { fontSize: 12, color: colors.textMuted },
  footerTotal: { fontSize: 19, fontWeight: '800', color: colors.primary },
  placeBtn: { minWidth: 150 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    ...shadow.raised,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  addressOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  addressOptionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
});
