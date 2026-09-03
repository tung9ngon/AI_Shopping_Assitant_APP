// UC-ORDER-02 — Chọn và áp mã giảm giá.
//
// Backend cho một đơn áp tối đa 2 mã: 1 mã giảm tiền hàng (category 'order') và
// 1 mã miễn phí ship (category 'free_shipping'). Màn hình chia đúng thành hai nhóm,
// mỗi nhóm chọn được một mã — thay vì bắt người dùng gõ tay mã trên bàn phím điện thoại.
//
// Hai nhóm nằm ở hai endpoint riêng (/discount-codes và /discount-codes/freeship) nên
// lấy cả hai một lượt.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import LoadState from '../../components/LoadState';
import { discountApi, type DiscountCodeItem } from '../../api/discounts';
import { useApi } from '../../hooks/useApi';
import { colors, radius, shadow, spacing } from '../../theme';
import { formatVND, formatDateShort } from '../../utils/format';
import { baseShippingFee, computeDiscount } from '../../utils/discount';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function VoucherPickerScreen() {
  const navigation = useNavigation<Nav>();
  const { subtotal, orderVoucherCode, shipVoucherCode } =
    useRoute<RouteProp<RootStackParamList, 'VoucherPicker'>>().params;

  const [pickedOrder, setPickedOrder] = useState<string | null>(orderVoucherCode);
  const [pickedShip, setPickedShip] = useState<string | null>(shipVoucherCode);

  const vouchers = useApi(
    () => Promise.all([discountApi.listOrderCodes(), discountApi.listFreeshipCodes()]),
    [],
  );

  // Trả về NGUYÊN OBJECT mã đã chọn (không chỉ code): Checkout cần loại giảm/mức giảm
  // để tính bản xem trước, và đã có sẵn ở đây thì không bắt nó tải lại danh sách.
  const apply = () => {
    const [orderList, shipList] = vouchers.data ?? [[], []];
    navigation.navigate({
      name: 'Checkout',
      params: {
        orderVoucher: orderList.find((v) => v.code === pickedOrder) ?? null,
        shipVoucher: shipList.find((v) => v.code === pickedShip) ?? null,
      },
      merge: true,
    });
  };

  if (!vouchers.data) {
    return (
      <Screen edges={[]}>
        <LoadState loading={vouchers.loading} error={vouchers.error} onRetry={vouchers.reload} />
      </Screen>
    );
  }

  const [orderVouchers, shipVouchers] = vouchers.data;

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.groupTitle}>Mã giảm tiền hàng</Text>
        <Text style={styles.groupHint}>Chọn tối đa 1 mã</Text>
        {orderVouchers.length === 0 ? <Text style={styles.empty}>Chưa có mã nào.</Text> : null}
        {orderVouchers.map((v) => (
          <VoucherRow
            key={v.code}
            voucher={v}
            subtotal={subtotal}
            selected={pickedOrder === v.code}
            onToggle={() => setPickedOrder(pickedOrder === v.code ? null : v.code)}
          />
        ))}

        <Text style={[styles.groupTitle, styles.groupTitleGap]}>Mã miễn phí vận chuyển</Text>
        <Text style={styles.groupHint}>Chọn tối đa 1 mã</Text>
        {shipVouchers.length === 0 ? <Text style={styles.empty}>Chưa có mã nào.</Text> : null}
        {shipVouchers.map((v) => (
          <VoucherRow
            key={v.code}
            voucher={v}
            subtotal={subtotal}
            selected={pickedShip === v.code}
            onToggle={() => setPickedShip(pickedShip === v.code ? null : v.code)}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          title="Bỏ chọn tất cả"
          variant="ghost"
          onPress={() => {
            setPickedOrder(null);
            setPickedShip(null);
          }}
          style={styles.flex}
        />
        <AppButton title="Áp dụng" onPress={apply} style={styles.flex} />
      </View>
    </Screen>
  );
}

function VoucherRow({
  voucher,
  subtotal,
  selected,
  onToggle,
}: {
  voucher: DiscountCodeItem;
  subtotal: number;
  selected: boolean;
  onToggle: () => void;
}) {
  // Chưa đạt giá trị đơn tối thiểu thì mã hiển thị mờ và không bấm được.
  const shortfall = (voucher.min_order_value ?? 0) - subtotal;
  const usable = shortfall <= 0;
  // Mã freeship tính trên phí ship thực tế của đơn (0 nếu đã đạt ngưỡng miễn ship) —
  // "Tiết kiệm" mới không phóng đại quá số tiền ship thật.
  const shippingFee = voucher.category === 'free_shipping' ? baseShippingFee(subtotal) : null;
  const saving = computeDiscount(voucher, subtotal, shippingFee);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: !usable }}
      accessibilityLabel={`Mã ${voucher.code}. ${voucher.description ?? ''}`}
      onPress={usable ? onToggle : undefined}
      style={[styles.row, selected && styles.rowSelected, !usable && styles.rowDisabled]}
    >
      <View style={[styles.stub, selected && styles.stubSelected]}>
        <Ionicons
          name={voucher.category === 'free_shipping' ? 'car-outline' : 'pricetag-outline'}
          size={20}
          color={selected ? colors.textInverse : colors.primary}
        />
      </View>

      <View style={styles.body}>
        <Text style={styles.code}>{voucher.code}</Text>
        <Text style={styles.desc}>{voucher.description ?? '—'}</Text>

        {usable ? (
          saving > 0 ? (
            <Text style={styles.saving}>Tiết kiệm {formatVND(saving)}</Text>
          ) : null
        ) : (
          <Text style={styles.shortfall}>Mua thêm {formatVND(shortfall)} để dùng mã này</Text>
        )}

        {/* Số lượt còn lại không hiển thị được: danh sách của backend không trả về
            usage_limit / used_count. */}
        <Text style={styles.expiry}>HSD {formatDateShort(voucher.valid_until)}</Text>
      </View>

      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={selected ? colors.primary : colors.borderStrong}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: 110 },
  groupTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  groupTitleGap: { marginTop: spacing.xl },
  groupHint: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
  empty: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    // Viền trong suốt khi chưa chọn: giữ nguyên kích thước thẻ để lúc chọn viền hiện
    // ra mà nội dung không bị đẩy lệch đi 1px.
    borderWidth: 1,
    borderColor: 'transparent',
    ...shadow.card,
  },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rowDisabled: { opacity: 0.5 },
  stub: {
    width: 50,
    height: 50,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stubSelected: { backgroundColor: colors.primary },
  body: { flex: 1, gap: 1 },
  code: { fontSize: 14, fontWeight: '800', color: colors.text, letterSpacing: 0.3 },
  desc: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 },
  saving: { fontSize: 12, fontWeight: '700', color: colors.success, marginTop: 2 },
  shortfall: { fontSize: 12, fontWeight: '600', color: colors.warning, marginTop: 2 },
  expiry: { fontSize: 11, color: colors.textMuted, marginTop: 3 },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.raised,
  },
});
