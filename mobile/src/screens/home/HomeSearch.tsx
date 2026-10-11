import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';

import ProductThumb from '../../components/ProductThumb';
import type { ProductListItem } from '../../api/products';
import { colors, font, radius, shadow, spacing } from '../../theme';
import { formatVND } from '../../utils/format';
import { useSearchSuggestions } from './useSearchSuggestions';

type Props = {
  onSubmit: (keyword: string) => void;
  onPick: (item: ProductListItem) => void;
};

// Ô nhập thật, không phải nút mở tab Sản phẩm: gõ xong bấm Tìm là sang thẳng danh
// sách đã lọc theo từ khoá (tuyến Products nhận tham số `keyword`). Trước đây bấm
// vào chỉ chuyển tab rồi phải gõ lại.
export default function HomeSearch({ onSubmit, onPick }: Props) {
  const {
    keyword,
    setKeyword,
    suggestions,
    suggesting,
    suggestEmpty,
    showSuggestPanel,
    closeSuggestions,
  } = useSearchSuggestions();

  const submitSearch = () => {
    closeSuggestions();
    onSubmit(keyword.trim());
  };

  const pickSuggestion = (item: ProductListItem) => {
    closeSuggestions();
    onPick(item);
  };

  return (
    <View>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.ink} />
        <TextInput
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={submitSearch}
          placeholder="Tìm laptop, tai nghe, linh kiện…"
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

      {/* Bảng gợi ý nằm trong luồng, hero tự giãn cao ra chứa nó — Gradient
          cắt mọi thứ tràn ra ngoài (overflow hidden) nên không nổi đè được. */}
      {showSuggestPanel ? (
        <View style={styles.suggestPanel}>
          {suggestions.map((item, i) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => pickSuggestion(item)}
              style={({ pressed }) => [
                styles.suggestRow,
                i > 0 && styles.suggestRowBorder,
                pressed && styles.suggestRowPressed,
              ]}
            >
              <ProductThumb uri={item.primary_image} icon={null} size={36} />
              <View style={styles.suggestBody}>
                <Text style={styles.suggestName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.suggestPrice}>{formatVND(item.price)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
            </Pressable>
          ))}

          {suggesting && suggestions.length === 0 ? (
            <View style={styles.suggestStatusRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.suggestStatusText}>Đang tìm sản phẩm…</Text>
            </View>
          ) : null}

          {!suggesting && suggestEmpty ? (
            <View style={styles.suggestStatusRow}>
              <Ionicons name="search-outline" size={15} color={colors.textMuted} />
              <Text style={styles.suggestStatusText}>Không tìm thấy sản phẩm phù hợp</Text>
            </View>
          ) : null}

          {suggestions.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={submitSearch}
              style={({ pressed }) => [styles.suggestAllRow, pressed && styles.suggestRowPressed]}
            >
              <Text style={styles.suggestAllText}>
                Xem tất cả kết quả cho “{keyword.trim()}”
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    height: 50,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 },

  suggestPanel: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  suggestRowPressed: { backgroundColor: colors.surfaceAlt },
  suggestBody: { flex: 1 },
  suggestName: { fontSize: 13.5, color: colors.text, fontWeight: '600' },
  suggestPrice: { fontSize: 12.5, color: colors.ink, ...font.price, marginTop: 1 },
  suggestStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  suggestStatusText: { fontSize: 12.5, color: colors.textMuted },
  suggestAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  suggestAllText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
