import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';

import BottomSheet from '../../components/BottomSheet';
import type { ConversationSummary } from '../../api/chat';
import { colors, radius, spacing } from '../../theme';
import { formatDate } from '../../utils/format';

// UC-AI-02 — lịch sử hội thoại. `sessions` null = đang tải.
export default function HistorySheet({
  visible,
  sessions,
  error,
  onClose,
  onSelect,
}: {
  visible: boolean;
  sessions: ConversationSummary[] | null;
  error: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.sheetTitle}>Các phiên tư vấn trước</Text>
      <Text style={styles.sheetHint}>
        Hội thoại được lưu trên máy chủ nên mở lại lúc nào cũng còn nguyên mạch tư vấn.
      </Text>

      {error ? (
        <Text style={styles.sheetEmpty}>{error}</Text>
      ) : sessions === null ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.sheetLoading} />
      ) : sessions.length === 0 ? (
        <Text style={styles.sheetEmpty}>Chưa có phiên tư vấn nào được lưu.</Text>
      ) : (
        // Danh sách phải cuộn được trong sheet có trần chiều cao — nhiều phiên mà
        // để View thường thì sheet tràn khỏi màn hình, các phiên cũ không bấm được.
        <ScrollView showsVerticalScrollIndicator={false}>
          {sessions.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              onPress={() => onSelect(s.id)}
              style={({ pressed }) => [styles.sessionRow, pressed && styles.sessionRowPressed]}
            >
              <View style={styles.sessionIcon}>
                <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.sessionTitle} numberOfLines={1}>
                  {s.title ?? 'Phiên tư vấn'}
                </Text>
                <Text style={styles.sessionMeta}>{formatDate(s.started_at)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  sheetEmpty: { fontSize: 13, color: colors.textMuted, paddingVertical: spacing.lg },
  sheetLoading: { paddingVertical: spacing.lg },
  sheetHint: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 19 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sessionRowPressed: { backgroundColor: colors.surfaceAlt },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  sessionMeta: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
});
