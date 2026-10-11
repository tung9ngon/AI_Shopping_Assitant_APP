import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';

import { colors, radius, spacing } from '../../theme';

type Props = {
  brands: string[];
  cardWidth: number;
  onPress: (brand: string) => void;
};

// Backend chỉ trả tên (GET /products/brands, string[]), không có logo — thẻ dùng
// monogram chữ cái đầu, đơn sắc như lưới danh mục để cả trang chung một hoà sắc.
export default function BrandGrid({ brands, cardWidth, onPress }: Props) {
  return (
    <View style={styles.brandGrid}>
      {brands.map((brand) => {
        return (
          <Pressable
            key={brand}
            accessibilityRole="button"
            onPress={() => onPress(brand)}
            style={({ pressed }) => [
              styles.brandCard,
              { width: cardWidth },
              pressed && styles.brandCardPressed,
            ]}
          >
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>
                {brand.trim()[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={styles.brandBody}>
              <Text style={styles.brandCardName} numberOfLines={1}>
                {brand}
              </Text>
              <Text style={styles.brandCardHint}>Xem sản phẩm</Text>
            </View>
            <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  brandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  brandCardPressed: { backgroundColor: colors.surfaceAlt },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { fontSize: 16, fontWeight: '800', color: colors.textInverse },
  brandBody: { flex: 1 },
  brandCardName: { fontSize: 13.5, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  brandCardHint: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
});
