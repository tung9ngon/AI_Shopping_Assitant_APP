// Thẻ mã giảm giá dạng vé cho băng "Ưu đãi đang có" ở trang chủ.
//
// Mã là dữ liệu thật từ /discount-codes; danh sách không trả số lượt còn lại nên
// không hiện "còn N lượt". Bấm vào là đi mua sắm — mã được chọn ở bước Đặt hàng
// (màn Chọn mã giảm giá), trang chủ không có ô nhập mã.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import Gradient from './Gradient';
import { colors, gradient, radius, shadow, spacing } from '../theme';
import { formatDateShort, formatVND } from '../utils/format';
import type { DiscountCodeItem } from '../api/discounts';

export const VOUCHER_WIDTH = 240;
const STUB_WIDTH = 60;
const NOTCH = 14;

// Mức giảm thành một dòng: "Giảm 10%", "Giảm 50.000₫", "Miễn phí vận chuyển".
function headlineOf(v: DiscountCodeItem): string {
  const amount = v.discount_type === 'percent' ? `${v.discount_value}%` : formatVND(v.discount_value);
  if (v.category === 'free_shipping') {
    return v.discount_type === 'percent' && v.discount_value >= 100
      ? 'Miễn phí vận chuyển'
      : `Giảm ${amount} phí ship`;
  }
  return `Giảm ${amount}`;
}

// Điều kiện dùng mã, chỉ ghi những gì backend trả về.
function conditionOf(v: DiscountCodeItem): string {
  const parts: string[] = [];
  if (v.min_order_value) parts.push(`Đơn từ ${formatVND(v.min_order_value)}`);
  if (v.discount_type === 'percent' && v.max_discount) parts.push(`tối đa ${formatVND(v.max_discount)}`);
  if (parts.length) return parts.join(' · ');
  return v.description ?? 'Không yêu cầu đơn tối thiểu';
}

export default function VoucherTicket({
  voucher,
  onPress,
}: {
  voucher: DiscountCodeItem;
  onPress: () => void;
}) {
  const isShip = voucher.category === 'free_shipping';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Mã ${voucher.code}, ${headlineOf(voucher)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.ticket, pressed && styles.pressed]}
    >
      {/* Cuống vé tô hai màu theo loại: cam cho giảm tiền hàng, xanh cho freeship —
          lướt qua băng là phân biệt được. */}
      <Gradient colors={isShip ? gradient.success : gradient.brand} style={styles.stub}>
        <Ionicons
          name={isShip ? 'car-outline' : 'pricetag-outline'}
          size={22}
          color={colors.textInverse}
        />
      </Gradient>

      <View style={styles.body}>
        <Text style={styles.headline} numberOfLines={1}>
          {headlineOf(voucher)}
        </Text>
        <Text style={styles.condition} numberOfLines={2}>
          {conditionOf(voucher)}
        </Text>
        <View style={styles.footer}>
          <View style={styles.codeChip}>
            <Text style={styles.code} numberOfLines={1}>
              {voucher.code}
            </Text>
          </View>
          {voucher.valid_until ? (
            <Text style={styles.expiry} numberOfLines={1}>
              HSD {formatDateShort(voucher.valid_until)}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Hai vết khuyết tròn ở ranh cuống/thân — cùng màu nền trang nên nửa ngoài
          "tan" vào nền, chỉ nửa trong hiện thành vết cắn của vé. Không dùng
          overflow hidden trên thẻ vì iOS sẽ cắt luôn cả bóng đổ. */}
      <View pointerEvents="none" style={[styles.notch, styles.notchTop]} />
      <View pointerEvents="none" style={[styles.notch, styles.notchBottom]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ticket: {
    width: VOUCHER_WIDTH,
    flexDirection: 'row',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  stub: {
    width: STUB_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  body: { flex: 1, padding: spacing.md, gap: 2 },
  headline: { fontSize: 15, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  condition: { fontSize: 11.5, color: colors.textSecondary, lineHeight: 16 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  codeChip: {
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  code: { fontSize: 11.5, fontWeight: '800', color: colors.primary, letterSpacing: 0.6 },
  expiry: { fontSize: 10.5, color: colors.textMuted },
  notch: {
    position: 'absolute',
    left: STUB_WIDTH - NOTCH / 2,
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: colors.bg,
  },
  notchTop: { top: -NOTCH / 2 },
  notchBottom: { bottom: -NOTCH / 2 },
});
