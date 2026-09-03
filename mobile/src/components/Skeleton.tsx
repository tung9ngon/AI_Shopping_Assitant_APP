// Khung xám nhấp nháy trong lúc chờ dữ liệu.
//
// Khác LoadState (vòng xoay giữa màn hình): khung này giữ đúng bố cục của nội dung
// sắp hiện, nên trang không nhảy khi dữ liệu về. Chỉ dùng cho lưới/băng sản phẩm ở
// trang chủ và màn hình sản phẩm; các màn hình khác vẫn dùng LoadState.
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme';

export function Skeleton({
  width,
  height,
  round = radius.md,
  style,
}: {
  width: DimensionValue;
  height: number;
  round?: number;
  style?: ViewStyle;
}) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    // opacity chạy được trên luồng giao diện (useNativeDriver), nên nhịp nhấp nháy
    // không khựng khi luồng JS đang bận dựng danh sách.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: round, backgroundColor: colors.border, opacity: pulse },
        style,
      ]}
    />
  );
}

/** Một ô giữ chỗ đúng hình dáng ProductCard. */
export function ProductCardSkeleton({ width }: { width: number }) {
  return (
    <View style={[styles.card, { width }]}>
      <Skeleton width="100%" height={width} round={0} />
      <View style={styles.body}>
        <Skeleton width="40%" height={9} round={radius.sm} />
        <Skeleton width="90%" height={12} round={radius.sm} />
        <Skeleton width="55%" height={16} round={radius.sm} />
      </View>
    </View>
  );
}

/** Lưới 2 cột giữ chỗ, khớp lề với lưới sản phẩm thật. */
export function ProductGridSkeleton({ width, count = 4 }: { width: number; count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} width={width} />
      ))}
    </View>
  );
}

/** Băng ngang giữ chỗ, khớp lề với danh sách cuộn ngang ở trang chủ. */
export function ProductRailSkeleton({ width = 160, count = 3 }: { width?: number; count?: number }) {
  return (
    <View style={styles.rail}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} width={width} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  body: { padding: spacing.md, gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rail: { flexDirection: 'row', gap: spacing.md },
});
