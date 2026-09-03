// Trang tài khoản — cửa vào các chức năng cá nhân.
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import LoadState from '../../components/LoadState';
import Gradient from '../../components/Gradient';
import { useAuth } from '../../context/AuthContext';
import { colors, gradient, radius, shadow, spacing, useTabBarHeight } from '../../theme';
import { avatarInitial, formatDateShort } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Tên người Việt xếp họ trước, tên gọi sau — chữ đại diện lấy chữ đầu của từ cuối
// ("Nguyễn Thanh Tùng" -> "T").
type MenuItem = {
  icon: IoniconsIconName;
  label: string;
  hint?: string;
  onPress?: () => void;
  upcoming?: boolean;
};

export default function AccountScreen() {
  const navigation = useNavigation<Nav>();
  const tabBarHeight = useTabBarHeight();
  const { user, restoring, signOut, refreshUser } = useAuth();

  // Mở app là phải hỏi máy chủ xem cookie phiên còn hiệu lực không — trong lúc đó
  // chưa biết đã đăng nhập hay chưa, đừng hiện nhầm màn "chưa đăng nhập".
  if (restoring) {
    return (
      <Screen>
        <LoadState loading={true} error={null} onRetry={() => refreshUser()} />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <View style={styles.guest}>
          <Gradient colors={gradient.brandSoft} style={styles.guestIcon}>
            <Ionicons name="person-outline" size={34} color={colors.primary} />
          </Gradient>
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

  const personal: MenuItem[] = [
    {
      icon: 'location-outline',
      label: 'Sổ địa chỉ',
      hint: 'Quản lý địa chỉ giao hàng',
      onPress: () => navigation.navigate('AddressBook'),
    },
    {
      icon: 'person-circle-outline',
      label: 'Hồ sơ cá nhân',
      hint: 'Họ tên, số điện thoại',
      onPress: () => navigation.navigate('Profile'),
    },
    {
      icon: 'heart-outline',
      label: 'Sở thích mua sắm',
      hint: 'Giúp trợ lý AI tư vấn sát hơn',
      onPress: () => navigation.navigate('Preferences'),
    },
  ];

  // Các mục đã có API/kế hoạch nhưng chưa dựng giao diện — ghi rõ ra thay vì để nút
  // bấm không phản hồi.
  const mobile: MenuItem[] = [
    { icon: 'finger-print-outline', label: 'Mở khoá bằng sinh trắc học', hint: 'UC-MOB-03', upcoming: true },
    { icon: 'cloud-offline-outline', label: 'Xem lại khi mất mạng', hint: 'UC-MOB-05', upcoming: true },
  ];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + spacing.lg }]}>
        {/* ---- Thẻ hồ sơ ---- */}
        <View style={styles.profile}>
          <Gradient colors={gradient.brand} style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitial(user.full_name)}</Text>
          </Gradient>
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
  scroll: { padding: spacing.lg, gap: spacing.lg },

  guest: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.sm },
  guestIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
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
    borderRadius: radius.xl,
    ...shadow.card,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: colors.textInverse },
  name: { fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
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
  groupBody: { backgroundColor: colors.surface, borderRadius: radius.xl, ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 14.5, fontWeight: '600', color: colors.text },
  rowLabelMuted: { color: colors.textSecondary },
  rowHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  soonTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  soonText: { fontSize: 10.5, fontWeight: '700', color: colors.textMuted },

  signOut: { marginTop: spacing.sm },
});
