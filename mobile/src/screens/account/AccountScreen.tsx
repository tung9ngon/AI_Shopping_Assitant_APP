// Trang tài khoản — cửa vào các chức năng cá nhân.
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, shadow, spacing, tabBarHeight } from '../../theme';
import { formatDateShort } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Tên người Việt xếp họ trước, tên gọi sau — chữ đại diện lấy chữ đầu của từ cuối
// ("Nguyễn Thanh Tùng" -> "T").
function avatarInitial(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return (parts[parts.length - 1]?.[0] ?? '?').toUpperCase();
}

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress?: () => void;
  upcoming?: boolean;
};

export default function AccountScreen() {
  const navigation = useNavigation<Nav>();
  const { user, signOut } = useAuth();

  if (!user) {
    return (
      <Screen>
        <View style={styles.guest}>
          <View style={styles.guestIcon}>
            <Ionicons name="person-outline" size={32} color={colors.textMuted} />
          </View>
          <Text style={styles.guestTitle}>Bạn chưa đăng nhập</Text>
          <Text style={styles.guestDesc}>
            Đăng nhập để mua hàng, theo dõi đơn và lưu lại các phiên tư vấn với trợ lý AI.
          </Text>
          <AppButton title="Đăng nhập" block onPress={() => navigation.navigate('Login')} style={styles.guestBtn} />
          <AppButton
            title="Tạo tài khoản mới"
            variant="outline"
            block
            onPress={() => navigation.navigate('Register')}
          />
        </View>
      </Screen>
    );
  }

  const shopping: MenuItem[] = [
    {
      icon: 'receipt-outline',
      label: 'Đơn hàng của tôi',
      hint: 'Theo dõi trạng thái giao hàng',
      onPress: () => navigation.navigate('Orders'),
    },
    {
      icon: 'notifications-outline',
      label: 'Theo dõi giá',
      hint: 'Báo khi sản phẩm giảm tới mức bạn đặt',
      onPress: () => navigation.navigate('PriceAlerts'),
    },
  ];

  // Các mục đã có API ở backend nhưng chưa dựng giao diện trong vòng này —
  // ghi rõ ra thay vì để nút bấm không phản hồi.
  const personal: MenuItem[] = [
    { icon: 'location-outline', label: 'Sổ địa chỉ', hint: 'Quản lý địa chỉ giao hàng', upcoming: true },
    { icon: 'person-circle-outline', label: 'Hồ sơ cá nhân', hint: 'Họ tên, số điện thoại, ảnh đại diện', upcoming: true },
    { icon: 'heart-outline', label: 'Sở thích mua sắm', hint: 'Giúp trợ lý AI tư vấn sát hơn', upcoming: true },
  ];

  const mobile: MenuItem[] = [
    { icon: 'finger-print-outline', label: 'Mở khoá bằng sinh trắc học', hint: 'UC-MOB-03', upcoming: true },
    { icon: 'cloud-offline-outline', label: 'Xem lại khi mất mạng', hint: 'UC-MOB-05', upcoming: true },
  ];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ---- Thẻ hồ sơ ---- */}
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitial(user.full_name)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.name}>{user.full_name}</Text>
            <Text style={styles.email}>{user.email ?? user.phone_number ?? '—'}</Text>
            <Text style={styles.since}>Thành viên từ {formatDateShort(user.created_at)}</Text>
          </View>
        </View>

        <MenuGroup title="Mua sắm" items={shopping} />
        <MenuGroup title="Tài khoản" items={personal} />
        <MenuGroup title="Tính năng của bản di động" items={mobile} />

        <AppButton
          title="Đăng xuất"
          variant="danger"
          block
          onPress={() =>
            Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất khỏi thiết bị này?', [
              { text: 'Ở lại', style: 'cancel' },
              { text: 'Đăng xuất', style: 'destructive', onPress: signOut },
            ])
          }
          style={styles.signOut}
        />
      </ScrollView>
    </Screen>
  );
}

function MenuGroup({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupBody}>
        {items.map((item, i) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityState={{ disabled: !!item.upcoming }}
            onPress={item.onPress}
            disabled={!item.onPress}
            style={[styles.row, i > 0 && styles.rowBorder]}
          >
            <View style={styles.rowIcon}>
              <Ionicons name={item.icon} size={19} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.rowLabel, item.upcoming && styles.rowLabelMuted]}>{item.label}</Text>
              {item.hint ? <Text style={styles.rowHint}>{item.hint}</Text> : null}
            </View>
            {item.upcoming ? (
              <View style={styles.soonTag}>
                <Text style={styles.soonText}>Vòng sau</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: tabBarHeight + spacing.lg, gap: spacing.lg },

  guest: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.sm },
  guestIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  guestTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  guestDesc: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  guestBtn: { marginBottom: spacing.sm },

  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: colors.textInverse },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  since: { fontSize: 11.5, color: colors.textMuted, marginTop: 3 },

  group: { gap: spacing.sm },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xs,
  },
  groupBody: { backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 14.5, fontWeight: '600', color: colors.text },
  rowLabelMuted: { color: colors.textSecondary },
  rowHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  soonTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  soonText: { fontSize: 10.5, fontWeight: '700', color: colors.textMuted },

  signOut: { marginTop: spacing.sm },
});
