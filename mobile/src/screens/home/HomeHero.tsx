import type { ReactNode } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Gradient from '../../components/Gradient';
import { useAuth } from '../../context/AuthContext';
import { colors, gradient, radius, spacing } from '../../theme';

type Props = {
  unreadCount: number;
  onOpenNotifications: () => void;
  // Ô tìm kiếm nằm trong khối tối, dưới dòng tiêu đề.
  children: ReactNode;
};

function greetingByHour(hour: number): string {
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

// Đầu trang: khối màu mực mang nhận diện, chứa thương hiệu + tiêu đề + ô tìm kiếm.
// Chừa sẵn paddingBottom lớn để khối trợ lý AI phía dưới đè lên được.
export default function HomeHero({ unreadCount, onOpenNotifications, children }: Props) {
  // Khối tối chạy lên sát đỉnh máy nên Screen không chừa vùng an toàn nữa; phần chừa
  // đó lấy đúng số đo của thiết bị và đắp vào paddingTop của chính khối tối.
  const insets = useSafeAreaInsets();

  // Nền đầu trang tối nên chữ thanh trạng thái phải sáng — chỉ trong lúc đứng ở
  // trang chủ. Dùng component <StatusBar> chứ không gọi setBarStyle: <StatusBar> ở
  // App.tsx sẽ ghi đè lệnh gọi trực tiếp; component gắn sau cùng thì thắng, gỡ ra
  // (rời tab) là tự trả về chữ tối.
  const focused = useIsFocused();

  // Tên người Việt xếp họ trước, tên gọi sau — lời chào lấy từ cuối.
  const { user } = useAuth();
  const firstName = user?.full_name.trim().split(/\s+/).pop();
  const greeting = firstName ? `${greetingByHour(new Date().getHours())}, ${firstName}` : null;

  return (
    <Gradient colors={gradient.brand} angle="vertical" style={styles.hero}>
      {focused ? <StatusBar barStyle="light-content" /> : null}
      <View style={[styles.heroInner, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.brandRow}>
          {/* Monogram chữ N trên ô xanh ngọc — dấu nhận diện duy nhất có màu trong
              khối tối, mắt dừng ở đó trước tiên. */}
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>N</Text>
          </View>
          <Text style={styles.brandName}>NexTech</Text>
          <View style={styles.flex} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'
            }
            onPress={onOpenNotifications}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            hitSlop={6}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.textInverse} />
            {unreadCount > 0 ? <View style={styles.dot} /> : null}
          </Pressable>
        </View>

        {/* Đã đăng nhập thì dòng trên là lời chào theo tên — trang chủ nhận ra người
            quen thay vì lặp lại khẩu hiệu. */}
        <Text style={styles.eyebrow} numberOfLines={1}>
          {greeting ?? 'Thiết bị và linh kiện điện tử'}
        </Text>
        <Text style={styles.headline}>Đúng ngành học,{'\n'}đúng đồ án, đúng túi tiền.</Text>

        {children}
      </View>
    </Gradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    paddingBottom: spacing.xxl + spacing.xl + spacing.sm,
    borderBottomLeftRadius: radius.xl + spacing.sm,
    borderBottomRightRadius: radius.xl + spacing.sm,
  },
  heroInner: { paddingHorizontal: spacing.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: radius.md - 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: { fontSize: 17, fontWeight: '900', color: colors.textInverse, letterSpacing: -0.5 },
  brandName: { fontSize: 18, fontWeight: '800', color: colors.textInverse, letterSpacing: -0.4 },
  // Nút tròn viền mảnh trắng mờ: đủ thấy là nút bấm trên nền tối mà không thành mảng.
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  iconBtnPressed: { backgroundColor: 'rgba(255,255,255,0.16)' },
  dot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: gradient.brand[0],
  },
  eyebrow: {
    marginTop: spacing.lg,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.62)',
  },
  headline: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: -0.8,
  },
});
