// UC-PROD-01 — Dạo trang chủ cửa hàng.
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import ProductCard from '../../components/ProductCard';
import SectionHeader from '../../components/SectionHeader';
import { colors, radius, shadow, spacing, tabBarHeight } from '../../theme';
import { mockBrands, mockCategories, mockDeals, mockProducts } from '../../mocks/data';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Đồng hồ đếm ngược của khối "Deal hot hôm nay" — hết ngày là hết khuyến mãi.
function useCountdownToMidnight() {
  const [left, setLeft] = useState(() => msToMidnight());
  useEffect(() => {
    const timer = setInterval(() => setLeft(msToMidnight()), 1000);
    return () => clearInterval(timer);
  }, []);
  const total = Math.max(0, Math.floor(left / 1000));
  return {
    h: String(Math.floor(total / 3600)).padStart(2, '0'),
    m: String(Math.floor((total % 3600) / 60)).padStart(2, '0'),
    s: String(total % 60).padStart(2, '0'),
  };
}

function msToMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const countdown = useCountdownToMidnight();

  // Lưới 2 cột: trừ lề trái/phải và khoảng cách giữa hai cột.
  const cardWidth = useMemo(
    () => (width - spacing.lg * 2 - spacing.md) / 2,
    [width],
  );

  const newProducts = useMemo(
    () =>
      [...mockProducts]
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .slice(0, 6),
    [],
  );

  const openProduct = (productId: string) => navigation.navigate('ProductDetail', { productId });

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ---- Đầu trang: thương hiệu + ô tìm kiếm ---- */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Ionicons name="flash" size={16} color={colors.textInverse} />
            </View>
            <Text style={styles.brandName}>NexTech</Text>
            <View style={styles.spacer} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Thông báo"
              style={styles.iconBtn}
              hitSlop={6}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              <View style={styles.dot} />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="search"
            accessibilityLabel="Tìm sản phẩm"
            onPress={() => navigation.navigate('Tabs', { screen: 'Products' })}
            style={styles.searchBar}
          >
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <Text style={styles.searchHint}>Tìm laptop, điện thoại, tai nghe…</Text>
          </Pressable>
        </View>

        {/* ---- Danh mục ---- */}
        <View style={styles.categoryRow}>
          {mockCategories.map((cat) => (
            <Pressable
              key={cat.id}
              accessibilityRole="button"
              onPress={() => navigation.navigate('Tabs', { screen: 'Products', params: { categoryId: cat.id } })}
              style={styles.categoryItem}
            >
              <View style={styles.categoryIcon}>
                <Ionicons
                  name={(cat.icon ?? 'cube-outline') as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.categoryLabel} numberOfLines={2}>
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ---- Mời dùng trợ lý AI: chức năng lõi tạo khác biệt (nhóm C) ---- */}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Tabs', { screen: 'Chat' })}
          style={styles.aiBanner}
        >
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={22} color={colors.primary} />
          </View>
          <View style={styles.aiTextBox}>
            <Text style={styles.aiTitle}>Chưa biết chọn máy nào?</Text>
            <Text style={styles.aiDesc}>
              Nói nhu cầu bằng lời thường, trợ lý AI tra kho hàng thật rồi tư vấn cho bạn.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textInverse} />
        </Pressable>

        {/* ---- Deal hot hôm nay ---- */}
        <View style={styles.dealHeader}>
          <View style={styles.dealTitleRow}>
            <Ionicons name="flame" size={18} color={colors.danger} />
            <Text style={styles.dealTitle}>Deal hot hôm nay</Text>
          </View>
          <View style={styles.countdown}>
            {[countdown.h, countdown.m, countdown.s].map((part, i) => (
              <View key={i} style={styles.countRow}>
                {i > 0 ? <Text style={styles.countColon}>:</Text> : null}
                <View style={styles.countBox}>
                  <Text style={styles.countText}>{part}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <FlatList
          horizontal
          data={mockDeals}
          keyExtractor={(item) => item.product.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dealList}
          renderItem={({ item }) => (
            <ProductCard
              product={item.product}
              originalPrice={item.originalPrice}
              width={160}
              onPress={() => openProduct(item.product.id)}
            />
          )}
        />

        {/* ---- Sản phẩm mới ---- */}
        <SectionHeader
          title="Sản phẩm mới"
          actionLabel="Xem tất cả"
          onAction={() => navigation.navigate('Tabs', { screen: 'Products' })}
        />
        <View style={styles.grid}>
          {newProducts.map((p) => (
            <ProductCard key={p.id} product={p} width={cardWidth} onPress={() => openProduct(p.id)} />
          ))}
        </View>

        {/* ---- Thương hiệu ---- */}
        <SectionHeader title="Thương hiệu" />
        <View style={styles.brandGrid}>
          {mockBrands.map((brand) => (
            <Pressable
              key={brand}
              accessibilityRole="button"
              onPress={() => navigation.navigate('Tabs', { screen: 'Products', params: { keyword: brand } })}
              style={styles.brandChip}
            >
              <Text style={styles.brandChipText}>{brand}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: tabBarHeight + spacing.lg },

  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  spacer: { flex: 1 },
  iconBtn: { padding: 4 },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 42,
  },
  searchHint: { fontSize: 14, color: colors.textMuted },

  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  categoryItem: { width: '33.333%', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 17 },

  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    ...shadow.card,
  },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTextBox: { flex: 1, gap: 2 },
  aiTitle: { fontSize: 15, fontWeight: '700', color: colors.textInverse },
  aiDesc: { fontSize: 12, color: '#ffe6d5', lineHeight: 17 },

  dealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  dealTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dealTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  countdown: { flexDirection: 'row', alignItems: 'center' },
  countRow: { flexDirection: 'row', alignItems: 'center' },
  countBox: {
    backgroundColor: colors.text,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: { color: colors.textInverse, fontSize: 12, fontWeight: '700' },
  countColon: { color: colors.text, fontWeight: '700', paddingHorizontal: 2 },
  dealList: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },

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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandChipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
});
