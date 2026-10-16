import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import CategoryIcon from '../../components/CategoryIcon';
import { colors, radius, spacing } from '../../theme';
import type { Category } from '../../types';

// Lưới danh mục đơn sắc: ô trắng viền tóc, glyph màu mực cùng một nét vẽ. Mỗi ô một
// màu pastel trông như mẫu giao diện dựng sẵn; đơn sắc để ảnh sản phẩm bên dưới là
// thứ có màu trên trang.
// Băng cuộn ngang thay vì lưới: số danh mục do backend quyết, lưới cố định cột hay
// bị mồ côi một ô ở hàng cuối; băng ngang lộ nửa ô cuối báo hiệu còn nữa.
type Props = {
  categories: Category[];
  onPress: (categoryId: string) => void;
};

export default function CategoryGrid({ categories, onPress }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={categoryStyles.categoryRow}
    >
      {categories.map((cat) => {
        return (
          <Pressable
            key={cat.id}
            accessibilityRole="button"
            onPress={() => onPress(cat.id)}
            style={categoryStyles.categoryItem}
          >
            {({ pressed }) => (
              <>
                <View
                  style={[
                    categoryStyles.categoryIcon,
                    pressed && categoryStyles.categoryIconPressed,
                  ]}
                >
                  <CategoryIcon name={cat.name} icon={cat.icon} size={24} color={colors.ink} />
                </View>
                <Text style={categoryStyles.categoryLabel} numberOfLines={2}>
                  {cat.name}
                </Text>
              </>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// HomeSkeleton dùng lại categoryRow/categoryItem để khung giữ chỗ khớp đúng lưới thật.
export const categoryStyles = StyleSheet.create({
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  categoryItem: { width: 82, alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.lg + 2,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconPressed: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 2,
  },
});
