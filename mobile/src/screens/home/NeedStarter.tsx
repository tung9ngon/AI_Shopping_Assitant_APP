import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';

import { colors, radius, spacing } from '../../theme';

// Ba lối vào theo nhóm người dùng của tài liệu mô tả sản phẩm (mục 2): người dùng chọn
// tình huống của mình thay vì phải biết trước tên hay cấu hình sản phẩm. Bấm vào là mở
// trợ lý kèm một câu hỏi mẫu; câu hỏi để ngỏ cho trợ lý hỏi thêm ngành học, yêu cầu,
// ngân sách (mục 4.4) chứ không đoán sẵn thay người dùng.
const NEEDS: { title: string; desc: string; icon: IoniconsIconName; prompt: string }[] = [
  {
    title: 'Tân sinh viên',
    desc: 'Ngành học cần gì, món nào mua trước',
    icon: 'school-outline',
    prompt:
      'Mình là tân sinh viên, chưa rõ ngành học cần thiết bị gì. Bạn hỏi giúp mình ngành và ngân sách rồi gợi ý món cần mua ngay, món có thể mua sau nhé.',
  },
  {
    title: 'Làm đồ án',
    desc: 'Bo mạch, cảm biến, linh kiện theo yêu cầu',
    icon: 'hardware-chip-outline',
    prompt:
      'Mình đang làm đồ án và cần mua linh kiện. Bạn hỏi giúp mình yêu cầu đồ án rồi gợi ý linh kiện phù hợp trong kho nhé.',
  },
  {
    title: 'Chưa rành công nghệ',
    desc: 'Giải thích thông số bằng lời dễ hiểu',
    icon: 'help-circle-outline',
    prompt:
      'Mình không rành công nghệ. Bạn hỏi giúp mình mục đích sử dụng và ngân sách, rồi giải thích dễ hiểu nên chọn sản phẩm nào nhé.',
  },
];

export default function NeedStarter({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <View style={styles.card}>
      {NEEDS.map((need, i) => (
        <Pressable
          key={need.title}
          accessibilityRole="button"
          accessibilityLabel={`${need.title}: ${need.desc}. Hỏi trợ lý`}
          onPress={() => onPick(need.prompt)}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.icon}>
            <Ionicons name={need.icon} size={20} color={colors.ink} />
          </View>
          {/* Vạch ngăn nằm trong phần chữ, thụt sau cột icon như danh sách hệ thống. */}
          <View style={[styles.body, i > 0 && styles.bodyDivider]}>
            <View style={styles.text}>
              <Text style={styles.title}>{need.title}</Text>
              <Text style={styles.desc} numberOfLines={1}>
                {need.desc}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const ROW_HEIGHT = 64;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.lg },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.md,
    paddingRight: spacing.lg,
  },
  bodyDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  desc: { fontSize: 12.5, color: colors.textMuted },
});
