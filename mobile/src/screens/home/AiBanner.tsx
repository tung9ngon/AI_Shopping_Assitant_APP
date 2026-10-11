import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';

import { colors, radius, shadow, spacing } from '../../theme';

// Mời dùng trợ lý AI: chức năng lõi tạo khác biệt (nhóm C).
// Lề trên âm để thẻ nằm đè lên mép dưới khối tối: đầu trang và phần thân khoá vào
// nhau thay vì xếp rời từng khối.
export default function AiBanner({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Mở trợ lý tư vấn"
      onPress={onPress}
      style={({ pressed }) => [styles.aiBanner, pressed && styles.aiBannerPressed]}
    >
      <View style={styles.aiIcon}>
        <Ionicons name="chatbubbles" size={20} color={colors.primary} />
      </View>
      <View style={styles.aiTextBox}>
        <Text style={styles.aiKicker}>TRỢ LÝ TƯ VẤN</Text>
        <Text style={styles.aiTitle}>Không cần biết tên sản phẩm</Text>
        <Text style={styles.aiDesc}>
          Kể ngành học, mục đích dùng và ngân sách — trợ lý tra kho hàng thật rồi gợi ý.
        </Text>
      </View>
      <View style={styles.aiChevron}>
        <Ionicons name="arrow-forward" size={16} color={colors.textInverse} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: -(spacing.xxl + spacing.md),
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadow.float,
  },
  aiBannerPressed: { backgroundColor: colors.surfaceAlt },
  aiIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTextBox: { flex: 1, gap: 2 },
  aiKicker: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 1 },
  aiTitle: { fontSize: 15.5, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  aiDesc: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 17 },
  aiChevron: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
