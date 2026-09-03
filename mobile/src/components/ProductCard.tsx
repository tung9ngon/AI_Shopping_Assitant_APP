// Thẻ sản phẩm dạng lưới — dùng ở trang chủ và màn hình tìm/lọc.
//
// Nhận `ProductListItem` chứ không phải `Product`: GET /api/products trả bản rút gọn
// (product.service.ts toListItem), không có quan hệ category/images.
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import ProductThumb from './ProductThumb';
import { colors, radius, shadow, spacing } from '../theme';
import { formatVND } from '../utils/format';
import type { ProductListItem } from '../api/products';

// memo: thẻ nằm trong lưới 50 phần tử của màn tìm kiếm — mỗi ký tự gõ vào ô search
// re-render cả màn hình, không chặn ở đây thì 50 thẻ ảnh vẽ lại theo từng phím.
function ProductCard({
  product,
  width,
  onPress,
}: {
  product: ProductListItem;
  width: number;
  onPress: () => void;
}) {
  const score = product.rating ?? 0;
  const tag = product.tags?.[0];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, giá ${formatVND(product.price)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      {/* Ảnh tràn hết bề ngang thẻ. Nền xám nhạt của ProductThumb vẫn giữ vai trò cũ:
          ảnh sản phẩm thường nền trắng, đặt thẳng lên thẻ trắng thì mất mép ảnh. */}
      <View style={styles.media}>
        <ProductThumb uri={product.primary_image} size={width} style={styles.thumb} />

        {tag ? (
          <View style={styles.tag}>
            <Text style={styles.tagText} numberOfLines={1}>
              {tag}
            </Text>
          </View>
        ) : null}

        {/* Điểm đánh giá đặt đè lên ảnh thay vì xuống dưới giá: thẻ ở băng ngang chỉ
            rộng 160, để cùng hàng với giá là tràn chữ. Sản phẩm chưa có đánh giá thì
            bỏ hẳn huy hiệu — không chiếm chỗ cho dòng "Chưa có đánh giá". */}
        {score > 0 ? (
          <View style={styles.score}>
            <Ionicons name="star" size={10} color={colors.warning} />
            <Text style={styles.scoreText}>{score.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.brand} numberOfLines={1}>
          {product.brand ?? '—'}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.price}>{formatVND(product.price)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.card,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },

  media: { position: 'relative' },
  // Ảnh tràn mép nên góc trên do thẻ bo, ảnh tự nó không bo.
  thumb: { borderRadius: 0 },

  tag: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    maxWidth: '70%',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  score: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    // Nền trắng đục: ảnh sản phẩm sáng tối khác nhau, để trong suốt thì có ảnh làm
    // mất chữ.
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  scoreText: { fontSize: 11, fontWeight: '700', color: colors.text },

  body: { padding: spacing.md, gap: 3 },
  brand: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  name: { fontSize: 13, color: colors.text, lineHeight: 18, minHeight: 36 },
  price: { fontSize: 16, fontWeight: '800', color: colors.primary, marginTop: 2 },
});

export default memo(ProductCard);
