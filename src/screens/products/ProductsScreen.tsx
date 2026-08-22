// UC-PROD-02 — Tìm và lọc sản phẩm.
//
// Trên màn hình nhỏ, bộ lọc đầy đủ đặt trong lớp phủ trượt lên (bottom sheet) thay vì
// cột lọc bên trái như bản web; chỉ danh mục — thứ dùng nhiều nhất — giữ ngay trên đầu.
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import ProductCard from '../../components/ProductCard';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import { colors, radius, shadow, spacing, tabBarHeight } from '../../theme';
import { mockBrands, mockCategories, mockProducts } from '../../mocks/data';
import type { RootStackParamList, TabParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Sort = 'newest' | 'price_asc' | 'price_desc' | 'rating';

const SORTS: { key: Sort; label: string }[] = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'price_asc', label: 'Giá thấp đến cao' },
  { key: 'price_desc', label: 'Giá cao đến thấp' },
  { key: 'rating', label: 'Đánh giá cao' },
];

const PRICE_BANDS: { label: string; min: number; max: number }[] = [
  { label: 'Dưới 5 triệu', min: 0, max: 5_000_000 },
  { label: '5 – 10 triệu', min: 5_000_000, max: 10_000_000 },
  { label: '10 – 20 triệu', min: 10_000_000, max: 20_000_000 },
  { label: 'Trên 20 triệu', min: 20_000_000, max: Number.MAX_SAFE_INTEGER },
];

export default function ProductsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<TabParamList, 'Products'>>();
  const { width } = useWindowDimensions();

  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [band, setBand] = useState<number | null>(null);
  const [sort, setSort] = useState<Sort>('newest');
  const [filterOpen, setFilterOpen] = useState(false);

  // Trang chủ điều hướng sang kèm danh mục hoặc từ khoá — nhận vào đây.
  useEffect(() => {
    if (route.params?.categoryId !== undefined) setCategoryId(route.params.categoryId ?? null);
    if (route.params?.keyword !== undefined) setKeyword(route.params.keyword ?? '');
  }, [route.params]);

  const cardWidth = (width - spacing.lg * 2 - spacing.md) / 2;

  const results = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const range = band != null ? PRICE_BANDS[band] : null;

    const filtered = mockProducts.filter((p) => {
      if (categoryId && p.category_id !== categoryId) return false;
      if (brand && p.brand !== brand) return false;
      if (kw && !`${p.name} ${p.brand ?? ''}`.toLowerCase().includes(kw)) return false;
      if (range) {
        const price = Number(p.price);
        if (price < range.min || price >= range.max) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      switch (sort) {
        case 'price_asc':
          return Number(a.price) - Number(b.price);
        case 'price_desc':
          return Number(b.price) - Number(a.price);
        case 'rating':
          return Number(b.rating ?? 0) - Number(a.rating ?? 0);
        default:
          return +new Date(b.created_at) - +new Date(a.created_at);
      }
    });
  }, [keyword, categoryId, brand, band, sort]);

  const activeFilters = (brand ? 1 : 0) + (band != null ? 1 : 0) + (sort !== 'newest' ? 1 : 0);

  const resetFilters = () => {
    setBrand(null);
    setBand(null);
    setSort('newest');
  };

  return (
    <Screen>
      {/* ---- Ô tìm kiếm + nút mở bộ lọc ---- */}
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
          style={styles.filterBtn}
        >
          <Ionicons name="options-outline" size={20} color={colors.text} />
          {activeFilters > 0 ? (
            <View style={styles.filterCount}>
              <Text style={styles.filterCountText}>{activeFilters}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* ---- Danh mục ---- */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Chip label="Tất cả" active={categoryId === null} onPress={() => setCategoryId(null)} />
          {mockCategories.map((c) => (
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
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          results.length > 0 ? (
            <Text style={styles.count}>{results.length} sản phẩm</Text>
          ) : null
        }
        ListEmptyComponent={
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
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            width={cardWidth}
            onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
          />
        )}
      />

      {/* ---- Lớp phủ bộ lọc ---- */}
      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFilterOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
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
              {mockBrands.map((b) => (
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
            title={`Xem ${results.length} sản phẩm`}
            block
            onPress={() => setFilterOpen(false)}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </Modal>
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 0 },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: colors.primary },

  count: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: tabBarHeight + spacing.lg },
  column: { gap: spacing.md, marginBottom: spacing.md },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '75%',
    ...shadow.raised,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
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
