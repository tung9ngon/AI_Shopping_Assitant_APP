// UC-ORDER-01 — Đặt hàng từ giỏ hàng.
//
// Hai lối vào: từ màn Giỏ hàng (đặt các dòng đang tick) và từ nút "Mua ngay" ở màn
// chi tiết sản phẩm — lối sau truyền `buyNowItemId` và đơn CHỈ gồm đúng dòng đó,
// phần còn lại của giỏ không bị kéo vào đơn.
// UC-PAY-01 / UC-PAY-02 — Chọn hình thức thanh toán (PayOS hoặc COD).
//
// Quy tắc tính tiền lấy đúng theo BE/src/users/order/order.service.ts:
//   phí ship 30.000đ, miễn phí khi tạm tính từ 500.000đ;
//   một đơn áp tối đa 2 mã — 1 mã giảm tiền hàng + 1 mã miễn phí ship.
//
// Số tiền trên màn hình này chỉ là BẢN XEM TRƯỚC. POST /api/orders tính lại toàn bộ từ
// giỏ trên máy chủ, và con số trong phản hồi mới là số chính thức — đó là số được mang
// sang màn thanh toán / xác nhận đơn.
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import ProductThumb from '../../components/ProductThumb';
import { GrandTotalRow, SummaryRow } from '../../components/OrderSummary';
import { useAccount } from '../../context/AccountContext';
import { useCart } from '../../context/CartContext';
import { type DiscountCodeItem } from '../../api/discounts';
import { orderApi } from '../../api/orders';
import { paymentApi } from '../../api/payments';
import { getErrorMessage } from '../../api/client';
import { colors, radius, shadow, spacing } from '../../theme';
import { formatVND } from '../../utils/format';
import { baseShippingFee, computeDiscount } from '../../utils/discount';
import type { RootStackParamList } from '../../navigation/types';
import type { PaymentMethod } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PAYMENT_OPTIONS: {
  method: PaymentMethod;
  title: string;
  desc: string;
  icon: IoniconsIconName;
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
  const { cart, selectedItems, selectedSubtotal, reload: reloadCart } = useCart();
  const { addresses, defaultAddress } = useAccount();

  const [addressId, setAddressId] = useState<string | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('payos');
  const [orderVoucher, setOrderVoucher] = useState<DiscountCodeItem | null>(null);
  const [shipVoucher, setShipVoucher] = useState<DiscountCodeItem | null>(null);
  const [placing, setPlacing] = useState(false);

  // Nhận kết quả từ màn hình chọn mã — nguyên object mã, đủ dữ liệu tính bản xem trước.
  useEffect(() => {
    if (route.params?.orderVoucher !== undefined) setOrderVoucher(route.params.orderVoucher);
    if (route.params?.shipVoucher !== undefined) setShipVoucher(route.params.shipVoucher);
  }, [route.params]);

  const address = addresses.find((a) => a.id === addressId) ?? defaultAddress;

  // "Mua ngay": chỉ đúng một dòng giỏ, bỏ qua trạng thái tick ở màn Giỏ hàng.
  const buyNowItemId = route.params?.buyNowItemId;
  const items = useMemo(
    () => (buyNowItemId ? cart.items.filter((it) => it.id === buyNowItemId) : selectedItems),
    [buyNowItemId, cart.items, selectedItems],
  );
  const subtotal = useMemo(
    () =>
      buyNowItemId
        ? items.reduce((sum, it) => sum + it.product.price * it.quantity, 0)
        : selectedSubtotal,
    [buyNowItemId, items, selectedSubtotal],
  );

  // Chỉ tính trên các dòng đã tick ở màn Giỏ hàng — đây cũng đúng phần được gửi lên
  // POST /orders, phần còn lại ở nguyên trong giỏ.
  const totals = useMemo(() => {
    const baseShipping = baseShippingFee(subtotal);
    const orderDiscount = computeDiscount(orderVoucher, subtotal);
    const shipDiscount = computeDiscount(shipVoucher, subtotal, baseShipping);
    return {
      subtotal,
      baseShipping,
      orderDiscount,
      shipDiscount,
      total: Math.max(0, subtotal - orderDiscount + baseShipping - shipDiscount),
    };
  }, [subtotal, orderVoucher, shipVoucher]);

  const voucherCount = (orderVoucher ? 1 : 0) + (shipVoucher ? 1 : 0);

  const placeOrder = async () => {
    if (!address || placing) return;
    setPlacing(true);
    try {
      // Mã sai/hết hạn thì backend tự từ chối khi tạo đơn.
      const order = await orderApi.create({
        address_id: address.id,
        cart_item_ids: items.map((item) => item.id),
        discount_code: orderVoucher?.code ?? undefined,
        freeship_code: shipVoucher?.code ?? undefined,
      });

      // Backend xoá sạch giỏ trong cùng giao dịch tạo đơn — tải lại để màn Giỏ hàng
      // và số trên tab không còn hàng cũ. Không await: kết quả không dùng ở bước nào
      // tiếp theo, chờ nó chỉ cộng thêm một vòng mạng vào cú bấm "Đặt hàng".
      // reload() tự nuốt lỗi vào state của CartContext nên không cần catch ở đây.
      void reloadCart();

      let payment;
      try {
        payment = await paymentApi.create(order.id, method);
      } catch (err) {
        // Đơn đã nằm trong hệ thống rồi, không được báo là đặt hàng thất bại.
        Alert.alert('Đã tạo đơn, chưa tạo được giao dịch', getErrorMessage(err));
        navigation.replace('OrderDetail', { orderId: order.id });
        return;
      }

      // COD: tạo đơn xong là xong. PayOS: phải chờ cổng thanh toán xác nhận mới coi là
      // đặt hàng thành công — đơn nằm ở trạng thái chờ thanh toán cho tới lúc đó.
      if (method === 'payos') {
        navigation.replace('PayosPayment', {
          orderId: order.id,
          paymentId: payment.id,
          total: order.total,
          qrCode: payment.qr_code,
          paymentUrl: payment.payment_url,
        });
        return;
      }
      navigation.replace('OrderSuccess', { orderId: order.id, total: order.total, method });
    } catch (err) {
      Alert.alert('Không đặt được hàng', getErrorMessage(err));
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ---- Địa chỉ giao hàng ---- */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={address ? 'Đổi địa chỉ giao hàng' : 'Thêm địa chỉ giao hàng'}
          onPress={() => (address ? setAddressOpen(true) : navigation.navigate('AddressForm', {}))}
          style={styles.addressCard}
        >
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <View style={styles.flex}>
            {address ? (
              <>
                <Text style={styles.addressName}>
                  {address.recipient_name} · {address.phone_number}
                </Text>
                <Text style={styles.addressText}>{address.full_address}</Text>
              </>
            ) : (
              <>
                <Text style={styles.addressName}>Chưa có địa chỉ giao hàng</Text>
                <Text style={styles.addressText}>Bấm để thêm địa chỉ nhận hàng.</Text>
              </>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        {/* ---- Sản phẩm ---- */}
        <Card title={`Sản phẩm (${items.length})`} style={styles.card}>
          {items.map((item, i) => (
            <View key={item.id} style={[styles.itemRow, i > 0 && styles.itemRowBorder]}>
              <ProductThumb uri={item.product.image} icon={null} size={48} />
              <View style={styles.flex}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product.name}
                </Text>
                <Text style={styles.itemQty}>Số lượng: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>
                {formatVND(item.product.price * item.quantity)}
              </Text>
            </View>
          ))}
        </Card>

        {/* ---- UC-ORDER-02: chọn mã giảm giá ---- */}
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate('VoucherPicker', {
              subtotal,
              orderVoucherCode: orderVoucher?.code ?? null,
              shipVoucherCode: shipVoucher?.code ?? null,
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
          <GrandTotalRow value={formatVND(totals.total)} />
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
          loading={placing}
          disabled={items.length === 0 || !address}
          style={styles.placeBtn}
        />
      </View>

      {/* ---- Sổ địa chỉ ---- */}
      <Modal visible={addressOpen} transparent animationType="slide" onRequestClose={() => setAddressOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAddressOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Chọn địa chỉ giao hàng</Text>
          {addresses.map((a) => {
            // So với địa chỉ đang dùng thật sự (đã tính fallback về địa chỉ mặc định),
            // không so addressId thô — lúc chưa chọn tay thì addressId còn là null.
            const active = a.id === address?.id;
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

          {/* Đã lưu sẵn địa chỉ thì thẻ địa chỉ ở trên mở lớp NÀY chứ không mở màn
              thêm địa chỉ — thiếu nút này là từ luồng đặt hàng không còn đường nào
              tới màn thêm địa chỉ, phải vòng qua Tài khoản → Sổ địa chỉ. */}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setAddressOpen(false);
              navigation.navigate('AddressForm', {});
            }}
            style={({ pressed }) => [styles.addAddressRow, pressed && styles.addAddressRowPressed]}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addAddressText}>Thêm địa chỉ mới</Text>
          </Pressable>
        </View>
      </Modal>
    </Screen>
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
    borderRadius: radius.xl,
    ...shadow.card,
  },
  addressHeadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addressName: { fontSize: 14, fontWeight: '700', color: colors.text },
  addressText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginTop: 2 },
  defaultTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
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
    borderRadius: radius.xl,
    ...shadow.card,
  },
  voucherLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  voucherValue: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.sm,
  },
  payOptionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  payTitle: { fontSize: 13.5, fontWeight: '600', color: colors.text },
  payTitleActive: { color: colors.primary },
  payDesc: { fontSize: 11.5, color: colors.textMuted, lineHeight: 16, marginTop: 2 },


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
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  addressOptionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  addAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    marginTop: spacing.xs,
  },
  addAddressRowPressed: { backgroundColor: colors.primarySoft },
  addAddressText: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
