// Thẻ sản phẩm dạng lưới — dùng ở trang chủ, màn hình tìm/lọc và băng gợi ý.
//
// Nhận `ProductListItem` chứ không phải `Product`: GET /api/products trả bản rút gọn
// (product.service.ts toListItem), không có quan hệ category/images.
import { memo, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import ProductThumb from './ProductThumb';
import { colors, radius, shadow, spacing } from '../theme';
import { formatVND } from '../utils/format';
import type { ProductListItem } from '../api/products';

// Dấu tick "đã vào giỏ" trên nút thêm nhanh tự trở lại dấu cộng sau khoảng này.
const ADDED_FEEDBACK_MS = 1500;

// memo: thẻ nằm trong lưới 50 phần tử của màn tìm kiếm — mỗi ký tự gõ vào ô search
// re-render cả màn hình, không chặn ở đây thì 50 thẻ ảnh vẽ lại theo từng phím.
function ProductCard({
  product,
  width,
  onPress,
  onAdd,
}: {
  product: ProductListItem;
  width: number;
  onPress: () => void;
  // Thêm nhanh vào giỏ (hooks/useQuickAdd). Không truyền thì thẻ không có nút này.
  // Nhận id thay vì closure theo từng thẻ để hàm giữ được cùng một tham chiếu.
  onAdd?: (productId: string) => Promise<boolean>;
}) {
  const score = product.rating ?? 0;
  const tag = product.tags?.[0];

  const [addState, setAddState] = useState<'idle' | 'adding' | 'added'>('idle');
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
    },
    [],
  );

  const handleAdd = async () => {
    if (!onAdd || addState !== 'idle') return;
    setAddState('adding');
    const ok = await onAdd(product.id);
    if (!ok) {
      setAddState('idle');
      return;
    }
    setAddState('added');
    addedTimer.current = setTimeout(() => setAddState('idle'), ADDED_FEEDBACK_MS);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, giá ${formatVND(product.price)}`}
      // Thẻ là một phần tử accessibility nên iOS gộp nút "+" lồng bên trong vào nó —
      // VoiceOver không tới được nút. Đưa thêm-vào-giỏ ra thành hành động của thẻ
      // (rotor actions) để người dùng đọc màn hình vẫn thêm được.
      accessibilityActions={onAdd ? [{ name: 'addToCart', label: 'Thêm vào giỏ' }] : undefined}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'addToCart') void handleAdd();
      }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      {/* Đổ bóng đặt ở lớp ngoài, cắt góc (overflow hidden) ở lớp trong: iOS cắt luôn
          cả bóng nếu cùng một View vừa đổ bóng vừa overflow hidden. */}
      <View style={styles.inner}>
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

          <View style={styles.priceRow}>
            {/* Thẻ hẹp nhất là 150 ở băng ngang: giá tám chữ số kèm ký hiệu phải tự
                co chữ lại thay vì cắt bớt số. */}
            <Text
              style={styles.price}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {formatVND(product.price)}
            </Text>

            {onAdd ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Thêm ${product.name} vào giỏ`}
                accessibilityState={{ busy: addState === 'adding' }}
                onPress={handleAdd}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.addBtn,
                  addState === 'added' && styles.addBtnDone,
                  pressed && addState === 'idle' && styles.addBtnPressed,
                ]}
              >
                {addState === 'adding' ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Ionicons
                    name={addState === 'added' ? 'checkmark' : 'add'}
                    size={19}
                    color={colors.textInverse}
                  />
                )}
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    ...shadow.card,
  },
  inner: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  price: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.primary, letterSpacing: -0.2 },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  addBtnDone: { backgroundColor: colors.success, shadowColor: colors.success },
  addBtnPressed: { opacity: 0.85, transform: [{ scale: 0.94 }] },
});

export default memo(ProductCard);
