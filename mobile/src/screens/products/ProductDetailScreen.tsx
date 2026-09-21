// UC-PROD-03 — Xem chi tiết sản phẩm. Kèm lối vào UC-ALERT-01 (đặt cảnh báo giá).
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton, { BUTTON_HEIGHT } from '../../components/AppButton';
import ProductCard from '../../components/ProductCard';
import ProductThumb from '../../components/ProductThumb';
import QuantityStepper from '../../components/QuantityStepper';
import Rating from '../../components/Rating';
import SectionHeader from '../../components/SectionHeader';
import StarRating from '../../components/StarRating';
import TextField from '../../components/TextField';
import Card from '../../components/Card';
import Gradient from '../../components/Gradient';
import LoadState from '../../components/LoadState';
import { useApi } from '../../hooks/useApi';
import { useQuickAdd } from '../../hooks/useQuickAdd';
import { productApi } from '../../api/products';
import { priceAlertApi } from '../../api/priceAlerts';
import { getErrorMessage } from '../../api/client';
import { useCart } from '../../context/CartContext';
import { colors, gradient, radius, shadow, spacing } from '../../theme';
import { formatVND } from '../../utils/format';
import { FREE_SHIPPING_THRESHOLD } from '../../constants';
import { getItems } from '../../types';
import type { ProductImage } from '../../types';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Băng "Có thể bạn cũng thích": lấy dư một để lọc bỏ chính sản phẩm đang xem.
const SIMILAR_LIMIT = 6;

// Cam kết hiện trên trang: chỉ ghi những gì app thật sự có — ngưỡng miễn ship lấy
// từ constants (khớp backend), hai hình thức thanh toán là hai lựa chọn ở màn Đặt
// hàng. Không bịa chính sách đổi trả/bảo hành vì backend không có.
const TRUST_ITEMS: { icon: IoniconsIconName; text: string }[] = [
  { icon: 'car-outline', text: `Freeship đơn từ ${formatVND(FREE_SHIPPING_THRESHOLD)}` },
  { icon: 'cash-outline', text: 'Thanh toán khi nhận hàng' },
  { icon: 'qr-code-outline', text: 'Quét QR PayOS trên máy' },
];

export default function ProductDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { productId } = useRoute<RouteProp<RootStackParamList, 'ProductDetail'>>().params;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { add } = useCart();
  const quickAdd = useQuickAdd();

  // GET /products/:id trả kèm cả category, images, specs, tags — không cần gọi
  // /products/:id/specs riêng.
  const { data: product, loading, error, reload } = useApi(
    () => productApi.detail(productId),
    [productId],
  );

  // Đánh giá nằm ở endpoint riêng. Chỉ lấy hai cái mới nhất cho phần xem trước —
  // tổng số đã có sẵn trong `review_count` của chi tiết sản phẩm.
  const reviews = useApi(() => productApi.reviews(productId, { limit: 2 }), [productId]);
  const reviewItems = reviews.data ? getItems(reviews.data) : [];

  // Sản phẩm cùng danh mục — chỉ gọi khi đã biết danh mục (sau khi chi tiết về).
  const categoryId = product?.category_id ?? null;
  const similar = useApi(
    (signal) =>
      categoryId
        ? productApi.list({ categoryId, limit: SIMILAR_LIMIT + 1 }, signal)
        : Promise.resolve(null),
    [categoryId],
  );
  const similarItems = similar.data
    ? getItems(similar.data).filter((p) => p.id !== productId).slice(0, SIMILAR_LIMIT)
    : [];

  const [quantity, setQuantity] = useState(1);
  const [alertOpen, setAlertOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [savingAlert, setSavingAlert] = useState(false);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  // Cờ riêng cho "Mua ngay" để spinner hiện đúng nút được bấm; cả hai nút cùng
  // khoá theo `adding` — bấm chồng khi request đang bay là số lượng bị cộng dồn.
  const [buying, setBuying] = useState(false);
  // Trang ảnh đang xem trong gallery (0-based) — cho dãy chấm bên dưới.
  const [page, setPage] = useState(0);

  // Nhãn "Đã thêm" tự tắt sau 1.8s — giữ timer để clear khi bấm dồn dập hoặc rời màn
  // trước khi hết giờ (setState trên component đã unmount).
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (addedTimer.current) clearTimeout(addedTimer.current);
  }, []);

  if (!product) {
    return (
      <Screen edges={[]}>
        <LoadState loading={loading} error={error} onRetry={reload} />
      </Screen>
    );
  }

  const price = product.price;

  // UC-ALERT-01. Cần đăng nhập: chưa đăng nhập backend trả 401 và hiện đúng thông báo.
  const createAlert = async () => {
    const target = Number(targetPrice);
    if (!targetPrice.trim() || Number.isNaN(target) || target <= 0) {
      Alert.alert('Chưa đặt được cảnh báo', 'Vui lòng nhập giá mục tiêu là số lớn hơn 0.');
      return;
    }
    setSavingAlert(true);
    try {
      await priceAlertApi.create(product.id, target);
      setAlertOpen(false);
      setTargetPrice('');
      Alert.alert('Đã đặt cảnh báo', `Giá xuống tới ${formatVND(target)} là hệ thống báo cho bạn.`);
    } catch (err) {
      Alert.alert('Chưa đặt được cảnh báo', getErrorMessage(err));
    } finally {
      setSavingAlert(false);
    }
  };

  // Gallery: mọi ảnh của sản phẩm theo sort_order, ảnh chính lên đầu. Không có ảnh
  // nào thì một trang giữ chỗ vẽ theo biểu tượng danh mục.
  const images: (ProductImage | null)[] = product.images?.length
    ? [...product.images].sort(
        (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
      )
    : [null];

  const onGalleryScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  // Giỏ hàng nằm trên máy chủ nên thêm vào giỏ là một lời gọi API có thể hỏng
  // (chưa đăng nhập -> 401). Báo lỗi thay vì im lặng.
  const addToCart = async () => {
    setAdding(true);
    try {
      return await add(product, quantity);
    } catch (err) {
      Alert.alert('Chưa thêm được vào giỏ', getErrorMessage(err));
      return null;
    } finally {
      setAdding(false);
    }
  };

  const handleAdd = async () => {
    if (!(await addToCart())) return;
    setAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 1800);
  };

  // Giỏ nằm trên máy chủ nên "Mua ngay" vẫn phải đi qua giỏ, nhưng chuyển thẳng id
  // dòng vừa thêm sang màn Đặt hàng: đơn chỉ gồm đúng sản phẩm này, hàng đang có sẵn
  // trong giỏ ở nguyên đó.
  const handleBuyNow = async () => {
    setBuying(true);
    try {
      const itemId = await addToCart();
      if (!itemId) return;
      navigation.navigate('Checkout', { buyNowItemId: itemId });
    } finally {
      setBuying(false);
    }
  };

  return (
    <Screen edges={[]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: ACTION_BAR_HEIGHT + insets.bottom }}
      >
        {/* Ảnh đặt trên nền cam rất nhạt thay vì nền trắng: ảnh sản phẩm phần lớn
            nền trắng, để trên nền trắng thì trông như trôi lơ lửng. Nhiều ảnh thì
            vuốt ngang từng trang, dãy chấm bên dưới báo đang ở ảnh nào. */}
        <Gradient colors={gradient.brandSoft} style={styles.gallery}>
          <FlatList
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            data={images}
            keyExtractor={(img, i) => img?.id ?? `placeholder-${i}`}
            onMomentumScrollEnd={onGalleryScrollEnd}
            renderItem={({ item }) => (
              <View style={[styles.galleryPage, { width }]}>
                <ProductThumb uri={item?.image_url} icon={product.category?.icon} size={width * 0.66} />
              </View>
            )}
          />
          {images.length > 1 ? (
            <View style={styles.dots} pointerEvents="none">
              {images.map((img, i) => (
                <View key={img?.id ?? i} style={[styles.dot, i === page && styles.dotActive]} />
              ))}
            </View>
          ) : null}
        </Gradient>

        {/* Khối thông tin bo góc trên và kéo lên đè lên mép dưới phần ảnh. */}
        <View style={styles.block}>
          <Text style={styles.brand}>{product.brand ?? '—'}</Text>
          <Text style={styles.name}>{product.name}</Text>

          {/* KHÔNG hiển thị trạng thái kho: stock_quantity trong DB không được bảo trì
              (toàn bộ catalog đang là 0) và backend cũng không chặn mua theo tồn kho —
              hiện "Còn hàng" là bịa, hiện "Hết hàng" là chặn mua oan cả cửa hàng. */}
          <View style={styles.metaRow}>
            <Rating value={product.rating} count={product.review_count} size={14} />
          </View>

          <Text style={styles.price}>{formatVND(price)}</Text>

          {product.tags?.length ? (
            <View style={styles.tagRow}>
              {product.tags.map((t) => (
                <View key={t.id} style={styles.tag}>
                  <Text style={styles.tagText}>{t.name ?? t.tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* ---- Cam kết mua hàng: ba điều app thật sự làm được ---- */}
          <View style={styles.trustRow}>
            {TRUST_ITEMS.map((item, i) => (
              <View key={item.icon} style={[styles.trustItem, i > 0 && styles.trustItemBorder]}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
                <Text style={styles.trustText} numberOfLines={2}>
                  {item.text}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Số lượng</Text>
            <QuantityStepper value={quantity} onChange={setQuantity} />
          </View>

          {/* Lối vào UC-ALERT-01: đồ điện tử đắt tiền, người mua hay chờ giảm giá */}
          <Pressable
            accessibilityRole="button"
            onPress={() => setAlertOpen(true)}
            style={({ pressed }) => [styles.alertRow, pressed && styles.alertRowPressed]}
          >
            <Ionicons name="notifications-outline" size={18} color={colors.primary} />
            <Text style={styles.alertText}>Báo tôi khi sản phẩm này giảm giá</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </View>

        <Card title="Mô tả" style={styles.card}>
          <Text style={styles.description}>{product.description ?? 'Chưa có mô tả.'}</Text>
        </Card>

        {product.specs?.length ? (
          <Card title="Thông số kỹ thuật" style={styles.card}>
            {product.specs.map((s, i) => (
              <View key={s.id} style={[styles.specRow, i > 0 && styles.specRowBorder]}>
                <Text style={styles.specKey}>{s.spec_key}</Text>
                <Text style={styles.specValue}>
                  {s.spec_value}
                  {s.spec_unit ? ` ${s.spec_unit}` : ''}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        {/* ---- Đánh giá: hai cái mới nhất, xem đủ ở màn riêng ---- */}
        <Card title="Đánh giá" style={styles.card}>
          {reviewItems.length === 0 ? (
            <Text style={styles.noReview}>
              {reviews.loading ? 'Đang tải đánh giá…' : 'Chưa có đánh giá nào cho sản phẩm này.'}
            </Text>
          ) : (
            reviewItems.map((r, i) => (
              <View key={r.id} style={[styles.reviewRow, i > 0 && styles.reviewRowBorder]}>
                <View style={styles.reviewHead}>
                  <Text style={styles.reviewName}>{r.user_name}</Text>
                  <StarRating value={r.rating} size={12} />
                </View>
                {r.title ? <Text style={styles.reviewTitle}>{r.title}</Text> : null}
                {r.content ? (
                  <Text style={styles.reviewContent} numberOfLines={3}>
                    {r.content}
                  </Text>
                ) : null}
              </View>
            ))
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Reviews', { productId: product.id })}
            style={({ pressed }) => [styles.reviewMore, pressed && styles.reviewMorePressed]}
          >
            <Text style={styles.reviewMoreText}>
              {product.review_count > 0
                ? `Xem tất cả ${product.review_count} đánh giá`
                : 'Viết đánh giá đầu tiên'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </Card>

        {/* ---- Cùng danh mục: giữ người xem ở lại thay vì quay ra rồi tìm lại ----
            Mở bằng push để nút quay lại vẫn về đúng sản phẩm đang xem. */}
        {similarItems.length > 0 ? (
          <View style={styles.similar}>
            <SectionHeader
              title="Có thể bạn cũng thích"
              subtitle={product.category?.name ? `Cùng danh mục ${product.category.name}` : undefined}
            />
            <FlatList
              horizontal
              data={similarItems}
              keyExtractor={(p) => p.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.similarList}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  width={150}
                  onPress={() => navigation.push('ProductDetail', { productId: item.id })}
                  onAdd={quickAdd}
                />
              )}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* ---- Thanh hành động cố định dưới màn hình ----
          Tạm tính theo số lượng đặt ngay cạnh nút mua: người mua thấy con số trước
          khi bấm, không phải nhẩm giá × số lượng. */}
      <View style={[styles.actionBar, { paddingBottom: spacing.md + insets.bottom }]}>
        <View style={styles.actionPrice}>
          <Text style={styles.actionLabel}>
            {quantity > 1 ? `Tạm tính · ${quantity} sản phẩm` : 'Tạm tính'}
          </Text>
          <Text style={styles.actionTotal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {formatVND(price * quantity)}
          </Text>
        </View>
        <AppButton
          title={added ? 'Đã thêm' : 'Thêm'}
          icon={added ? 'checkmark' : 'cart-outline'}
          variant="outline"
          loading={adding && !buying}
          disabled={adding}
          onPress={handleAdd}
        />
        <AppButton title="Mua ngay" loading={buying} disabled={adding} onPress={handleBuyNow} style={styles.flexBtn} />
      </View>

      {/* ---- UC-ALERT-01: đặt giá mục tiêu ---- */}
      <Modal visible={alertOpen} transparent animationType="fade" onRequestClose={() => setAlertOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAlertOpen(false)} />
        <View style={styles.dialogWrap} pointerEvents="box-none">
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Theo dõi giá</Text>
            <Text style={styles.dialogDesc}>
              Giá hiện tại {formatVND(price)}. Khi giá xuống tới mức bạn đặt, hệ thống sẽ báo ngay
              cho bạn.
            </Text>
            <TextField
              label="Giá mục tiêu (đ)"
              icon="pricetag-outline"
              keyboardType="number-pad"
              value={targetPrice}
              onChangeText={setTargetPrice}
              placeholder={String(Math.round(price * 0.9))}
            />
            <View style={styles.dialogActions}>
              <AppButton title="Huỷ" variant="ghost" onPress={() => setAlertOpen(false)} style={styles.flexBtn} />
              <AppButton
                title="Đặt cảnh báo"
                loading={savingAlert}
                onPress={createAlert}
                style={styles.flexBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

// Chiều cao thực của thanh hành động: nút + đệm trên/dưới.
const ACTION_BAR_HEIGHT = BUTTON_HEIGHT + spacing.md * 2;

const styles = StyleSheet.create({
  gallery: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  galleryPage: { alignItems: 'center' },
  // Dãy chấm nằm trên phần ảnh, cao hơn mép khối thông tin đè lên (marginTop -16).
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.xl + spacing.xs,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(242,109,33,0.28)' },
  dotActive: { width: 18, backgroundColor: colors.primary },

  block: {
    backgroundColor: colors.surface,
    marginTop: -spacing.lg,
    borderTopLeftRadius: radius.xl + spacing.sm,
    borderTopRightRadius: radius.xl + spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  brand: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, lineHeight: 27, letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  price: { fontSize: 27, fontWeight: '800', color: colors.primary, marginTop: spacing.xs, letterSpacing: -0.5 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
  },
  tagText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },

  trustRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
  },
  trustItem: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  trustItemBorder: { borderLeftWidth: 1, borderLeftColor: colors.border },
  trustText: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', lineHeight: 15 },

  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  qtyLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  alertRowPressed: { backgroundColor: '#ffe2ce' },
  alertText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.primary },

  card: { marginHorizontal: spacing.lg, marginTop: spacing.md },
  description: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, gap: spacing.lg },
  specRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  specKey: { fontSize: 14, color: colors.textMuted },
  specValue: { fontSize: 14, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  noReview: { fontSize: 13.5, color: colors.textMuted },
  reviewRow: { gap: spacing.xs, paddingVertical: spacing.sm },
  reviewRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewName: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  reviewTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  reviewContent: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  reviewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reviewMorePressed: { opacity: 0.6 },
  reviewMoreText: { fontSize: 13.5, fontWeight: '600', color: colors.primary },

  similar: { marginTop: spacing.xl },
  similarList: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.sm },

  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.raised,
  },
  actionPrice: { flexShrink: 1, minWidth: 92, paddingLeft: spacing.xs },
  actionLabel: { fontSize: 11, color: colors.textMuted },
  actionTotal: { fontSize: 18, fontWeight: '800', color: colors.primary, letterSpacing: -0.4 },
  flexBtn: { flex: 1 },

  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dialogWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  dialogDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  dialogActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
