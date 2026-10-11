// Danh sách đánh giá của một sản phẩm (GET /api/products/:id/reviews).
//
// Điểm ở đầu màn hình lấy từ `products.rating` — cột tổng hợp do backend tự tính,
// không phải trung bình cộng của trang đang xem (danh sách có phân trang).
import { useCallback, useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import LoadState from '../../components/LoadState';
import StarRating from '../../components/StarRating';
import { productApi } from '../../api/products';
import { useApi } from '../../hooks/useApi';
import { colors, radius, shadow, spacing } from '../../theme';
import { avatarInitial, formatDate } from '../../utils/format';
import { getItems, primaryImageOf } from '../../types';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Reviews'>;

// Chữ đại diện khi người đánh giá chưa có ảnh: lấy chữ đầu của từ cuối trong tên.
export default function ReviewsScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const product = useApi(() => productApi.detail(params.productId), [params.productId]);
  const reviews = useApi(() => productApi.reviews(params.productId, { limit: 50 }), [params.productId]);

  // Viết đánh giá xong quay lại đây phải thấy ngay. useApi chỉ gọi lúc gắn vào cây,
  // mà màn này không bị gỡ đi khi mở màn Viết đánh giá — nên tải lại lúc quay lại.
  const firstFocus = useRef(true);
  const { reload: reloadProduct } = product;
  const { reload: reloadReviews } = reviews;
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      reloadProduct();
      reloadReviews();
    }, [reloadProduct, reloadReviews]),
  );

  if (!reviews.data) {
    return (
      <Screen edges={[]}>
        <LoadState loading={reviews.loading} error={reviews.error} onRetry={reviews.reload} />
      </Screen>
    );
  }

  const items = getItems(reviews.data);
  // Điểm là cột tổng hợp của sản phẩm, không phải trung bình của trang đang xem.
  const score = product.data?.rating ?? 0;
  const total = product.data?.review_count ?? reviews.data.total;

  return (
    <Screen edges={[]}>
      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.summary}>
            <View style={styles.scoreBox}>
              <Text style={[styles.score, !score && styles.scoreEmpty]}>
                {score ? score.toFixed(1) : '—'}
              </Text>
              <StarRating value={score} size={13} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.productName} numberOfLines={2}>
                {product.data?.name ?? 'Sản phẩm'}
              </Text>
              <Text style={styles.count}>
                {total > 0 ? `${total} đánh giá` : 'Chưa có đánh giá'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubble-ellipses-outline"
            title="Chưa có đánh giá nào"
            description="Hãy là người đầu tiên chia sẻ trải nghiệm về sản phẩm này."
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.head}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{avatarInitial(item.user_name)}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.name}>{item.user_name}</Text>
                <View style={styles.metaRow}>
                  <StarRating value={item.rating} size={12} />
                  <Text style={styles.date}>{formatDate(item.created_at)}</Text>
                </View>
              </View>
            </View>

            {item.title ? <Text style={styles.title}>{item.title}</Text> : null}
            {item.content ? <Text style={styles.content}>{item.content}</Text> : null}
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
          <Text style={styles.note}>Chỉ đánh giá được sản phẩm trong đơn hàng đã hoàn tất.</Text>
        </View>
        <AppButton
          title="Viết đánh giá"
          icon="create-outline"
          variant="outline"
          block
          onPress={() =>
            navigation.navigate('WriteReview', {
              productId: params.productId,
              productName: product.data?.name ?? 'Sản phẩm',
              productImage: primaryImageOf(product.data?.images),
            })
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.md },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  // Vạch dọc mảnh tách điểm tổng khỏi tên sản phẩm — hai thông tin khác loại.
  scoreBox: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.lg,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.borderStrong,
  },
  score: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  // Chưa có điểm thì chỗ này là dấu gạch ngang. Để nguyên cỡ 30 chữ đen đậm thì nó
  // thành một vệt đen trông như ảnh lỗi — thu nhỏ và làm nhạt đi.
  scoreEmpty: { fontSize: 20, color: colors.textMuted },
  productName: { fontSize: 15, fontWeight: '700', color: colors.text, lineHeight: 21, letterSpacing: -0.2 },
  count: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted, marginTop: spacing.xs },

  card: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '800', color: colors.primary },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 3 },
  date: { fontSize: 11.5, color: colors.textMuted },

  title: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  content: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20 },

  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
  },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  note: { flex: 1, fontSize: 11.5, color: colors.textMuted, lineHeight: 16 },
});
