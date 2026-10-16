import { StyleSheet, View } from 'react-native';

import { VOUCHER_WIDTH } from '../../components/VoucherTicket';
import { ProductGridSkeleton, ProductRailSkeleton, Skeleton } from '../../components/Skeleton';
import { radius, spacing } from '../../theme';
import { categoryStyles } from './CategoryGrid';

// Khung giữ chỗ trong lúc chờ năm lời gọi API: giữ đúng thứ tự danh mục → băng ưu
// đãi → băng ngang → lưới, để trang không nhảy khi dữ liệu về.
export default function HomeSkeleton({ cardWidth }: { cardWidth: number }) {
  return (
    <View>
      <View style={categoryStyles.categoryRow}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={categoryStyles.categoryItem}>
            <Skeleton width={60} height={60} round={radius.lg + 2} />
            <Skeleton width={48} height={10} round={radius.sm} />
          </View>
        ))}
      </View>
      <View style={styles.skeletonSection}>
        <Skeleton width={130} height={18} round={radius.sm} style={styles.skeletonTitle} />
        <View style={[styles.skeletonRow, styles.skeletonRail]}>
          <Skeleton width={VOUCHER_WIDTH} height={84} round={radius.lg} />
          <Skeleton width={VOUCHER_WIDTH} height={84} round={radius.lg} />
        </View>
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
  skeletonSection: { paddingBottom: spacing.xl },
  skeletonTitle: { marginLeft: spacing.lg, marginBottom: spacing.md },
  skeletonRow: { paddingHorizontal: spacing.lg },
  skeletonRail: { flexDirection: 'row', gap: spacing.md },
});
