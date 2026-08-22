// Thẻ sản phẩm dạng lưới — dùng ở trang chủ và màn hình tìm/lọc.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ProductThumb from './ProductThumb';
import Rating from './Rating';
import { colors, radius, shadow, spacing } from '../theme';
import { formatVND } from '../utils/format';
import type { Product } from '../types';

export default function ProductCard({
  product,
  width,
  originalPrice,
  onPress,
}: {
  product: Product;
  width: number;
  originalPrice?: number;
  onPress: () => void;
}) {
  const price = Number(product.price);
  const discount =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, giá ${formatVND(price)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      <View>
        <ProductThumb uri={null} icon={product.category?.icon} size={width - spacing.md * 2} />
        {discount ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.brand}>{product.brand ?? '—'}</Text>
      <Text style={styles.name} numberOfLines={2}>
        {product.name}
      </Text>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatVND(price)}</Text>
        {originalPrice && originalPrice > price ? (
          <Text style={styles.original}>{formatVND(originalPrice)}</Text>
        ) : null}
      </View>

      <Rating value={product.rating} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadow.card,
  },
  pressed: { opacity: 0.85 },
  discountBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  discountText: { color: colors.textInverse, fontSize: 11, fontWeight: '700' },
  brand: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: spacing.sm },
  name: { fontSize: 13, color: colors.text, lineHeight: 18, minHeight: 36 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  price: { fontSize: 15, fontWeight: '700', color: colors.primary },
  original: { fontSize: 12, color: colors.textMuted, textDecorationLine: 'line-through' },
});
