// UC-PROD-02 — Tìm và lọc sản phẩm.
//
// Trên màn hình nhỏ, bộ lọc đầy đủ đặt trong lớp phủ trượt lên (bottom sheet) thay vì
// cột lọc bên trái như bản web; chỉ danh mục — thứ dùng nhiều nhất — giữ ngay trên đầu.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import ProductCard from '../../components/ProductCard';
import AppButton from '../../components/AppButton';
import BottomSheet from '../../components/BottomSheet';
import EmptyState from '../../components/EmptyState';
import Chip from '../../components/Chip';
import LoadState from '../../components/LoadState';
import { ProductGridSkeleton } from '../../components/Skeleton';
import { useApi } from '../../hooks/useApi';
import { useQuickAdd } from '../../hooks/useQuickAdd';
import { categoryApi } from '../../api/categories';
import { productApi, type ProductListItem } from '../../api/products';
import { colors, radius, shadow, spacing, useTabBarHeight } from '../../theme';
import { getItems } from '../../types';
import type { RootStackParamList, TabParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
// Giá trị khớp đúng QueryProductDto.sort của backend.
type Sort = 'newest' | 'price_asc' | 'price_desc' | 'rating_desc';

const PAGE_LIMIT = 50;
const SEARCH_DEBOUNCE_MS = 400;

const SORTS: { key: Sort; label: string }[] = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'price_asc', label: 'Giá thấp đến cao' },
  { key: 'price_desc', label: 'Giá cao đến thấp' },
  { key: 'rating_desc', label: 'Đánh giá cao' },
];

const PRICE_BANDS: { label: string; min: number; max: number | null }[] = [
  { label: 'Dưới 5 triệu', min: 0, max: 5_000_000 },
  { label: '5 – 10 triệu', min: 5_000_000, max: 10_000_000 },
  { label: '10 – 20 triệu', min: 10_000_000, max: 20_000_000 },
  // `max: null` = không giới hạn trên; không gửi maxPrice lên backend.
  { label: 'Trên 20 triệu', min: 20_000_000, max: null },
];

export default function ProductsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<TabParamList, 'Products'>>();
  const { width } = useWindowDimensions();
  const tabBarHeight = useTabBarHeight();

  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [band, setBand] = useState<number | null>(null);
  const [sort, setSort] = useState<Sort>('newest');
  const [filterOpen, setFilterOpen] = useState(false);

  // Trang chủ điều hướng sang kèm danh mục hoặc từ khoá — nhận vào đây. Từ khoá đặt
  // thẳng cả searchTerm (không qua debounce): debounce chỉ dành cho người đang gõ,
  // còn đợi 400ms ở đây thì lượt fetch đầu chạy với từ khoá rỗng — kết quả không lọc
  // chớp qua màn hình rồi mới đổi.
  useEffect(() => {
    if (route.params?.categoryId !== undefined) setCategoryId(route.params.categoryId ?? null);
    if (route.params?.keyword !== undefined) {
      const kw = route.params.keyword ?? '';
      setKeyword(kw);
      setSearchTerm(kw.trim());
    }
    // Chip thương hiệu ở Trang chủ đi qua param `brand` — search của BE chỉ khớp
    // tên sản phẩm, không khớp hãng.
    if (route.params?.brand !== undefined) setBrand(route.params.brand ?? null);
    // "Xem tất cả" ở băng Đánh giá cao nhất mở thẳng danh sách xếp theo điểm.
    if (route.params?.sort !== undefined) setSort(route.params.sort ?? 'newest');
  }, [route.params]);

  const cardWidth = (width - spacing.lg * 2 - spacing.md) / 2;

  // Gõ tới đâu gọi API tới đó thì mỗi ký tự là một request — đợi người dùng ngừng gõ.
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(keyword.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keyword]);

  const categories = useApi(() => categoryApi.list(), []);
  const brands = useApi(() => productApi.brands(), []);

  // Lọc và sắp xếp do backend làm (QueryProductDto), app chỉ gửi tham số.
  const range = band != null ? PRICE_BANDS[band] : null;
  const query = {
    search: searchTerm || undefined,
    categoryId: categoryId ?? undefined,
    brand: brand ?? undefined,
    minPrice: range?.min,
    maxPrice: range?.max ?? undefined,
    sort,
    limit: PAGE_LIMIT,
  };
  const page = useApi(
    (signal) => productApi.list(query, signal),
    [searchTerm, categoryId, brand, band, sort],
  );

  // Các trang sau trang 1, nạp dồn khi cuộn tới cuối. Lưu KÈM khoá truy vấn đã tạo ra
  // chúng: đổi bộ lọc thì phần nạp dồn tự thành rỗng ngay trong render (không có khung
  // hình nào nối nhầm trang của bộ lọc cũ), và lượt "tải thêm" về muộn thuộc bộ lọc cũ
  // cũng vô hại vì khoá không khớp.
  const queryKey = `${searchTerm}|${categoryId}|${brand}|${band}|${sort}`;
  const [extra, setExtra] = useState<{ key: string; items: ProductListItem[]; nextPage: number }>({
    key: queryKey,
    items: [],
    nextPage: 2,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const extraItems = extra.key === queryKey ? extra.items : [];

  const total = page.data?.total ?? 0;
  // Trang sau có thể lặp lại sản phẩm của trang trước (dữ liệu đổi giữa hai lần gọi)
  // — lọc trùng id để FlatList không gặp key trùng.
  const results = useMemo(() => {
    if (!page.data) return [];
    const seen = new Set<string>();
    return [...getItems(page.data), ...extraItems].filter((p) =>
      seen.has(p.id) ? false : (seen.add(p.id), true),
    );
  }, [page.data, extraItems]);

  const loadMore = async () => {
    if (loadingMore || page.loading || !page.data || results.length >= total) return;
    const key = queryKey;
    const pageToLoad = extra.key === key ? extra.nextPage : 2;
    setLoadingMore(true);
    try {
      const res = await productApi.list({ ...query, page: pageToLoad });
      setExtra((prev) => ({
        key,
        items: [...(prev.key === key ? prev.items : []), ...getItems(res)],
        nextPage: pageToLoad + 1,
      }));
    } catch {
      // Lỗi mạng lúc nạp thêm: giữ nguyên phần đã hiện, người dùng cuộn tiếp sẽ thử lại.
    } finally {
      setLoadingMore(false);
    }
  };

  const activeFilters = (brand ? 1 : 0) + (band != null ? 1 : 0) + (sort !== 'newest' ? 1 : 0);

  const quickAdd = useQuickAdd();

  // renderItem ổn định + ProductCard bọc memo: gõ từng ký tự vào ô tìm kiếm chỉ
  // re-render phần header, không vẽ lại cả lưới 50 thẻ ảnh theo từng phím.
  const renderItem = useCallback(
    ({ item }: { item: ProductListItem }) => (
      <ProductCard
        product={item}
        width={cardWidth}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        onAdd={quickAdd}
      />
    ),
    [cardWidth, navigation, quickAdd],
  );

  const resetFilters = () => {
    setBrand(null);
    setBand(null);
    setSort('newest');
  };

  return (
    <Screen>
      {/* ---- Đầu trang: ô tìm kiếm, nút lọc, hàng danh mục ----
          Gộp làm một khối trắng nổi trên nền xám thay vì hai dải kẻ vạch ngăn cách:
          cả ba thứ đều là công cụ lọc, tách ra thành hai tầng viền làm rối mắt. */}
      <View style={styles.header}>
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              placeholder="Tìm sản phẩm…"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
              accessibilityLabel="Ô tìm sản phẩm"
            />
            {keyword ? (
              <Pressable onPress={() => setKeyword('')} hitSlop={8} accessibilityLabel="Xoá từ khoá">
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở bộ lọc"
            onPress={() => setFilterOpen(true)}
            style={({ pressed }) => [
              styles.filterBtn,
              activeFilters > 0 && styles.filterBtnActive,
              pressed && styles.filterBtnPressed,
            ]}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeFilters > 0 ? colors.primary : colors.text}
            />
            {activeFilters > 0 ? (
              <View style={styles.filterCount}>
                <Text style={styles.filterCountText}>{activeFilters}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* ---- Danh mục ---- */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Chip label="Tất cả" active={categoryId === null} onPress={() => setCategoryId(null)} />
          {(categories.data ?? []).map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              active={categoryId === c.id}
              onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + spacing.lg }]}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={colors.primary} style={styles.footerLoading} /> : null
        }
        ListHeaderComponent={
          results.length > 0 ? (
            <Text style={styles.count}>
              {total > results.length ? (
                <>
                  Đang hiện <Text style={styles.countStrong}>{results.length}</Text> trong {total}{' '}
                  sản phẩm
                </>
              ) : (
                <>
                  <Text style={styles.countStrong}>{total}</Text> sản phẩm
                </>
              )}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          page.loading ? (
            <ProductGridSkeleton width={cardWidth} count={6} />
          ) : page.error ? (
            <LoadState loading={false} error={page.error} onRetry={page.reload} />
          ) : (
          <EmptyState
            icon="search-outline"
            title="Không tìm thấy sản phẩm nào"
            description="Thử bỏ bớt bộ lọc hoặc đổi từ khoá tìm kiếm."
            actionTitle="Xoá bộ lọc"
            onAction={() => {
              resetFilters();
              setCategoryId(null);
              setKeyword('');
            }}
          />
          )
        }
        renderItem={renderItem}
      />

      {/* ---- Lớp phủ bộ lọc ---- */}
      <BottomSheet visible={filterOpen} onClose={() => setFilterOpen(false)}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Bộ lọc</Text>
            <Pressable onPress={resetFilters} hitSlop={8} accessibilityRole="button">
              <Text style={styles.reset}>Đặt lại</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.groupTitle}>Sắp xếp theo</Text>
            <View style={styles.wrapRow}>
              {SORTS.map((s) => (
                <Chip key={s.key} label={s.label} active={sort === s.key} onPress={() => setSort(s.key)} />
              ))}
            </View>

            <Text style={styles.groupTitle}>Khoảng giá</Text>
            <View style={styles.wrapRow}>
              {PRICE_BANDS.map((p, i) => (
                <Chip
                  key={p.label}
                  label={p.label}
                  active={band === i}
                  onPress={() => setBand(band === i ? null : i)}
                />
              ))}
            </View>

            <Text style={styles.groupTitle}>Thương hiệu</Text>
            <View style={styles.wrapRow}>
              {(brands.data ?? []).map((b) => (
                <Chip
                  key={b}
                  label={b}
                  active={brand === b}
                  onPress={() => setBrand(brand === b ? null : b)}
                />
              ))}
            </View>
          </ScrollView>

          <AppButton
            title={`Xem ${total} sản phẩm`}
            block
            onPress={() => setFilterOpen(false)}
            style={{ marginTop: spacing.lg }}
          />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Cả khối đầu trang là một tấm trắng bo góc dưới, đổ bóng xuống phần danh sách —
  // thay cho hai dải kẻ viền chồng nhau ở bản trước.
  header: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    ...shadow.card,
    // Bóng phải nổi lên trên danh sách bên dưới, nếu không lưới sản phẩm che mất.
    zIndex: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 0 },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Đang có bộ lọc thì nút đổi sang sắc thương hiệu — huy hiệu đếm ở góc nhỏ, chỉ
  // mình nó thì dễ bỏ sót.
  filterBtnActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  filterBtnPressed: { backgroundColor: colors.border },
  filterCount: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: { color: colors.textInverse, fontSize: 10, fontWeight: '700' },

  chipRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },

  count: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  footerLoading: { paddingVertical: spacing.lg },
  countStrong: { fontWeight: '700', color: colors.text },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  column: { gap: spacing.md, marginBottom: spacing.md, alignItems: 'flex-start' },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  reset: { fontSize: 14, fontWeight: '600', color: colors.primary },
  groupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
