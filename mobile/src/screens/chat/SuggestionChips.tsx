import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';

import { colors, radius, spacing } from '../../theme';

// Gợi ý viết theo ba nhóm người dùng trong tài liệu mô tả sản phẩm (tân sinh viên,
// sinh viên làm đồ án, người chưa am hiểu công nghệ): câu nào cũng bắt đầu từ nhu cầu
// chứ không từ tên sản phẩm. Glyph cho biết câu hỏi thuộc tình huống nào.
const SUGGESTIONS: { text: string; icon: IoniconsIconName }[] = [
  { text: 'Tôi học thiết kế đồ họa, cần laptop trong ngân sách 20 triệu', icon: 'color-palette-outline' },
  { text: 'Tân sinh viên CNTT cần mua những thiết bị gì?', icon: 'school-outline' },
  { text: 'Đồ án cần cảm biến và bo mạch, nên chọn loại nào?', icon: 'hardware-chip-outline' },
  { text: 'Giải thích dễ hiểu: laptop i5 và i7 khác nhau ra sao?', icon: 'help-circle-outline' },
];

export default function SuggestionChips({ onPick }: { onPick: (text: string) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.suggestionsBar}
      contentContainerStyle={styles.suggestions}
    >
      {SUGGESTIONS.map((s) => (
        <Pressable
          key={s.text}
          accessibilityRole="button"
          onPress={() => onPick(s.text)}
          style={({ pressed }) => [styles.suggestionCard, pressed && styles.suggestionPressed]}
        >
          <View style={styles.suggestionIcon}>
            <Ionicons name={s.icon} size={16} color={colors.primary} />
          </View>
          <Text style={styles.suggestionText} numberOfLines={3}>
            {s.text}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // flexGrow:0 để dải gợi ý chỉ cao bằng nội dung: ScrollView của React Native mặc
  // định có flexGrow:1, để nguyên thì nó giành hết chỗ trống rồi kéo từng thẻ cao
  // theo.
  suggestionsBar: { flexGrow: 0 },
  suggestions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  suggestionCard: {
    width: 184,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  suggestionPressed: { backgroundColor: colors.surfaceAlt },
  suggestionIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: { fontSize: 13, lineHeight: 18, color: colors.text, fontWeight: '600' },
});
