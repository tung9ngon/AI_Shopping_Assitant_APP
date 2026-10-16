import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';

import { colors, radius, spacing } from '../../theme';

export default function ChatHeader({ onHistoryPress }: { onHistoryPress: () => void }) {
  return (
    <View style={styles.header}>
      {/* Ô mực mang dấu hội thoại, cùng hình với nút giữa thanh tab — nhận ra ngay
          đây là chỗ nút đó dẫn tới. */}
      <View style={styles.avatar}>
        <Ionicons name="chatbubbles" size={18} color={colors.textInverse} />
      </View>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>Trợ lý NexTech</Text>
        <Text style={styles.headerSub} numberOfLines={1}>Tư vấn dựa trên hàng đang có trong kho</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Lịch sử hội thoại"
        onPress={onHistoryPress}
        hitSlop={4}
        style={({ pressed }) => [styles.historyBtn, pressed && styles.historyBtnPressed]}
      >
        <Ionicons name="time-outline" size={19} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    // Thanh phẳng kẻ tóc như thanh tiêu đề hệ thống — khung trò chuyện nên lặng,
    // để tin nhắn là thứ nổi bật.
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderStrong,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.md + 2,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  historyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyBtnPressed: { backgroundColor: colors.surfaceAlt },
});
