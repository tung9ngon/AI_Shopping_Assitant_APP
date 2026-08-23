// UC-ORDER-02 — Chọn và áp mã giảm giá.
//
// Backend cho một đơn áp tối đa 2 mã: 1 mã giảm tiền hàng (category 'order') và
// 1 mã miễn phí ship (category 'free_shipping'). Màn hình chia đúng thành hai nhóm,
// mỗi nhóm chọn được một mã — thay vì bắt người dùng gõ tay mã trên bàn phím điện thoại.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import { colors, radius, shadow, spacing } from '../../theme';
import { formatVND, formatDateShort } from '../../utils/format';
import { mockVouchers } from '../../mocks/data';
import { computeDiscount } from './CheckoutScreen';
import type { RootStackParamList } from '../../navigation/types';
import type { DiscountCode } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function VoucherPickerScreen() {
  const navigation = useNavigation<Nav>();
  const { subtotal, orderVoucherId, shipVoucherId } =
    useRoute<RouteProp<RootStackParamList, 'VoucherPicker'>>().params;

  const [pickedOrder, setPickedOrder] = useState<string | null>(orderVoucherId);
  const [pickedShip, setPickedShip] = useState<string | null>(shipVoucherId);

  const orderVouchers = mockVouchers.filter((v) => v.category === 'order');
  const shipVouchers = mockVouchers.filter((v) => v.category === 'free_shipping');

  const apply = () => {
    navigation.navigate({
      name: 'Checkout',
      params: { orderVoucherId: pickedOrder, shipVoucherId: pickedShip },
      merge: true,
    });
  };

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.groupTitle}>Mã giảm tiền hàng</Text>
        <Text style={styles.groupHint}>Chọn tối đa 1 mã</Text>
        {orderVouchers.map((v) => (
          <VoucherRow
            key={v.id}
            voucher={v}
            subtotal={subtotal}
            selected={pickedOrder === v.id}
            onToggle={() => setPickedOrder(pickedOrder === v.id ? null : v.id)}
          />
        ))}

        <Text style={[styles.groupTitle, styles.groupTitleGap]}>Mã miễn phí vận chuyển</Text>
        <Text style={styles.groupHint}>Chọn tối đa 1 mã</Text>
        {shipVouchers.map((v) => (
          <VoucherRow
            key={v.id}
            voucher={v}
            subtotal={subtotal}
            selected={pickedShip === v.id}
            onToggle={() => setPickedShip(pickedShip === v.id ? null : v.id)}
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
  voucher: DiscountCode;
  subtotal: number;
  selected: boolean;
  onToggle: () => void;
}) {
  // Chưa đạt giá trị đơn tối thiểu thì mã hiển thị mờ và không bấm được.
  const shortfall = (voucher.min_order_value ?? 0) - subtotal;
  const usable = shortfall <= 0;
  const saving = computeDiscount(voucher, subtotal);

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

        <Text style={styles.expiry}>
          HSD {formatDateShort(voucher.valid_until)}
          {voucher.usage_limit != null
            ? ` · còn ${voucher.usage_limit - (voucher.used_count ?? 0)} lượt`
            : ''}
        </Text>
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

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  rowSelected: { borderColor: colors.primary },
  rowDisabled: { opacity: 0.5 },
  stub: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
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
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.raised,
  },
});
