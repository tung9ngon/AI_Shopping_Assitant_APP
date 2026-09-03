// UC-PROD-01 — Dạo trang chủ cửa hàng.
import { useMemo } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import ProductCard from '../../components/ProductCard';
import SectionHeader from '../../components/SectionHeader';
import CategoryIcon from '../../components/CategoryIcon';
import Gradient from '../../components/Gradient';
import LoadState from '../../components/LoadState';
import { ProductGridSkeleton, ProductRailSkeleton, Skeleton } from '../../components/Skeleton';
import { useApi } from '../../hooks/useApi';
import { categoryApi } from '../../api/categories';
import { productApi } from '../../api/products';
import { colors, gradient, radius, shadow, spacing, useTabBarHeight } from '../../theme';
import { getItems } from '../../types';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Ô danh mục lấy màu theo vị trí trong danh sách. Backend không lưu màu cho danh mục,
// mà sáu ô cùng một màu cam nhạt thì cả lưới thành một mảng phẳng — xoay vòng bảng
// này cho mỗi ô một sắc riêng.
const CATEGORY_TINTS: { bg: string; fg: string }[] = [
  { bg: '#fff1e7', fg: '#e35410' },
  { bg: '#eef3ff', fg: '#3b6bef' },
  { bg: '#eafbf1', fg: '#20a05e' },
  { bg: '#f6efff', fg: '#7c46cf' },
  { bg: '#e7fbfa', fg: '#0f9b93' },
  { bg: '#fff8e3', fg: '#c88a06' },
];

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  // Dải cam chạy lên sát đỉnh máy nên Screen không chừa vùng an toàn nữa; phần chừa
  // đó lấy đúng số đo của thiết bị và đắp vào paddingTop của chính dải cam.
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();

  // Bốn nguồn cho trang chủ, gọi song song để chỉ chờ một lượt.
  const { data, loading, error, reload } = useApi(
    () =>
      Promise.all([
        categoryApi.list(),
        productApi.list({ sort: 'newest', limit: 6 }),
        productApi.list({ sort: 'rating_desc', limit: 6 }),
        productApi.brands(),
      ]).then(([categories, newest, topRated, brands]) => ({
        categories,
        newest: getItems(newest),
        topRated: getItems(topRated),
        brands,
      })),
    [],
  );

  // Lưới 2 cột: trừ lề trái/phải và khoảng cách giữa hai cột.
  const cardWidth = useMemo(() => (width - spacing.lg * 2 - spacing.md) / 2, [width]);

  const openProduct = (productId: string) => navigation.navigate('ProductDetail', { productId });

  return (
    <Screen edges={[]} style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + spacing.lg }}
        // Tab Home không bao giờ unmount nên dữ liệu chỉ nạp một lần lúc mở app —
        // kéo xuống để làm mới là đường duy nhất cập nhật giá/hàng mới.
        refreshControl={
          <RefreshControl
            refreshing={loading && data != null}
            onRefresh={reload}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ---- Đầu trang: dải cam mang nhận diện, chứa thương hiệu + ô tìm kiếm ----
            Chừa sẵn paddingBottom lớn để khối trợ lý AI phía dưới đè lên được. */}
        <Gradient colors={gradient.brand} angle="vertical" style={styles.hero}>
          <View style={[styles.heroInner, { paddingTop: insets.top + spacing.sm }]}>
            <View style={styles.brandRow}>
              <View style={styles.logoMark}>
                <Ionicons name="flash" size={17} color={colors.textInverse} />
              </View>
              <View>
                <Text style={styles.brandName}>NexTech</Text>
                <Text style={styles.brandTagline}>Công nghệ chọn đúng nhu cầu</Text>
              </View>
              <View style={styles.spacer} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Thông báo"
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                hitSlop={6}
              >
                <Ionicons name="notifications-outline" size={21} color={colors.textInverse} />
                <View style={styles.dot} />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="search"
              accessibilityLabel="Tìm sản phẩm"
              onPress={() => navigation.navigate('Tabs', { screen: 'Products' })}
              style={({ pressed }) => [styles.searchBar, pressed && styles.searchBarPressed]}
            >
              <Ionicons name="search" size={18} color={colors.primary} />
              <Text style={styles.searchHint}>Tìm laptop, điện thoại, tai nghe…</Text>
            </Pressable>
          </View>
        </Gradient>

        {/* ---- Mời dùng trợ lý AI: chức năng lõi tạo khác biệt (nhóm C) ----
            Lề trên âm để thẻ nằm đè lên mép dưới dải cam: đầu trang và phần thân
            khoá vào nhau thay vì xếp rời từng khối. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Tabs', { screen: 'Chat' })}
          style={({ pressed }) => [styles.aiBanner, pressed && styles.aiBannerPressed]}
        >
          <Gradient colors={gradient.brandSoft} style={styles.aiIcon}>
            <Ionicons name="chatbubble-ellipses" size={22} color={colors.primary} />
          </Gradient>
          <View style={styles.aiTextBox}>
            <Text style={styles.aiTitle}>Chưa biết chọn máy nào?</Text>
            <Text style={styles.aiDesc}>
              Mô tả nhu cầu và ngân sách, trợ lý sẽ gợi ý máy phù hợp.
            </Text>
          </View>
          <View style={styles.aiChevron}>
            <Ionicons name="arrow-forward" size={16} color={colors.textInverse} />
          </View>
        </Pressable>

        {!data ? (
          loading ? (
            <HomeSkeleton cardWidth={cardWidth} />
          ) : (
            <LoadState loading={false} error={error} onRetry={reload} />
          )
        ) : (
          <>
            {/* ---- Danh mục ---- */}
            <View style={styles.categoryRow}>
              {data.categories.map((cat, i) => {
                const tint = CATEGORY_TINTS[i % CATEGORY_TINTS.length];
                return (
                  <Pressable
                    key={cat.id}
                    accessibilityRole="button"
                    onPress={() =>
                      navigation.navigate('Tabs', { screen: 'Products', params: { categoryId: cat.id } })
                    }
                    style={styles.categoryItem}
                  >
                    {({ pressed }) => (
                      <>
                        <View
                          style={[
                            styles.categoryIcon,
                            { backgroundColor: tint.bg },
                            pressed && styles.categoryIconPressed,
                          ]}
                        >
                          <CategoryIcon icon={cat.icon} size={26} color={tint.fg} />
                        </View>
                        <Text style={styles.categoryLabel} numberOfLines={2}>
                          {cat.name}
                        </Text>
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* ---- Đánh giá cao nhất ----
                Bản dựng giao diện có khối "Deal hot" kèm giá gốc gạch ngang, nhưng
                backend không lưu giá gốc/khuyến mãi nên không có nguồn để hiện. Đổi
                sang xếp theo điểm đánh giá — dữ liệu có thật. */}
            <SectionHeader title="Đánh giá cao nhất" />
            <FlatList
              horizontal
              data={data.topRated}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.railList}
              renderItem={({ item }) => (
                <ProductCard product={item} width={160} onPress={() => openProduct(item.id)} />
              )}
            />

            {/* ---- Sản phẩm mới ---- */}
            <SectionHeader
              title="Sản phẩm mới"
              actionLabel="Xem tất cả"
              onAction={() => navigation.navigate('Tabs', { screen: 'Products' })}
            />
            <View style={styles.grid}>
              {data.newest.map((p) => (
                <ProductCard key={p.id} product={p} width={cardWidth} onPress={() => openProduct(p.id)} />
              ))}
            </View>

            {/* ---- Thương hiệu ---- */}
            <SectionHeader title="Thương hiệu" />
            <View style={styles.brandGrid}>
              {data.brands.map((brand) => (
                <Pressable
                  key={brand}
                  accessibilityRole="button"
                  onPress={() =>
                    navigation.navigate('Tabs', { screen: 'Products', params: { brand } })
                  }
                  style={({ pressed }) => [styles.brandChip, pressed && styles.brandChipPressed]}
                >
                  <Text style={styles.brandChipText}>{brand}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Màn hình này bỏ vùng an toàn phía trên để dải cam chạm đỉnh máy, nên nội
          dung cuộn lên sẽ lọt vào sau đồng hồ/sóng. Dải màu đặc phủ đúng phần đó,
          lấy màu chặn đầu của dải cam — dải cam đổ dọc nên ở mép trên nó đúng một
          màu, ghép vào không thấy đường nối. */}
      <View
        pointerEvents="none"
        style={[styles.statusStrip, { height: insets.top }]}
      />
    </Screen>
  );
}

// Khung giữ chỗ trong lúc chờ bốn lời gọi API: giữ đúng thứ tự danh mục → băng ngang
// → lưới, để trang không nhảy khi dữ liệu về.
function HomeSkeleton({ cardWidth }: { cardWidth: number }) {
  return (
    <View>
      <View style={styles.categoryRow}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={styles.categoryItem}>
            <Skeleton width={56} height={56} round={radius.xl} />
            <Skeleton width={48} height={10} round={radius.sm} />
          </View>
        ))}
      </View>
      <View style={styles.skeletonSection}>
        <Skeleton width={140} height={18} round={radius.sm} style={styles.skeletonTitle} />
        <View style={styles.skeletonRow}>
          <ProductRailSkeleton />
        </View>
      </View>
      <View style={styles.skeletonSection}>
        <Skeleton width={110} height={18} round={radius.sm} style={styles.skeletonTitle} />
        <View style={styles.skeletonRow}>
          <ProductGridSkeleton width={cardWidth} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  statusStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: gradient.brand[0],
  },

  hero: {
    paddingBottom: spacing.xxl + spacing.xl,
    borderBottomLeftRadius: radius.xl + spacing.sm,
    borderBottomRightRadius: radius.xl + spacing.sm,
  },
  heroInner: { paddingHorizontal: spacing.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    // Trắng mờ trên nền cam: giữ được khối logo mà không cần thêm màu thứ ba.
    backgroundColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: 20, fontWeight: '800', color: colors.textInverse, letterSpacing: -0.4 },
  brandTagline: { fontSize: 11, color: '#ffe6d5', marginTop: 1 },
  spacer: { flex: 1 },
  iconBtn: { padding: 7, borderRadius: radius.pill },
  iconBtnPressed: { backgroundColor: 'rgba(255,255,255,0.2)' },
  dot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 46,
    marginTop: spacing.sm,
    ...shadow.float,
  },
  searchBarPressed: { backgroundColor: colors.surfaceAlt },
  searchHint: { fontSize: 14, color: colors.textMuted },

  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  categoryItem: { width: '33.333%', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconPressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  categoryLabel: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 17 },

  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: -(spacing.xxl + spacing.md),
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadow.float,
  },
  aiBannerPressed: { backgroundColor: colors.surfaceAlt },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTextBox: { flex: 1, gap: 2 },
  aiTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  aiDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  aiChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  railList: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  brandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  brandChip: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandChipPressed: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  brandChipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },

  skeletonSection: { paddingBottom: spacing.xl },
  skeletonTitle: { marginLeft: spacing.lg, marginBottom: spacing.md },
  skeletonRow: { paddingHorizontal: spacing.lg },
});
