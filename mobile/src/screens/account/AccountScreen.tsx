// Trang tài khoản — cửa vào các chức năng cá nhân.
import { Fragment } from 'react';
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
          <View style={styles.guestIcon}>
            <Ionicons name="person-outline" size={34} color={colors.primary} />
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
      icon: 'pricetag-outline',
      label: 'Theo dõi giá',
      hint: 'Báo khi sản phẩm giảm tới mức bạn đặt',
      onPress: () => navigation.navigate('PriceAlerts'),
    },
    // Chuông ở Trang chủ là lối vào duy nhất trước đây — người dùng ở tab Tài khoản
    // không có đường nào tới trung tâm thông báo.
    {
      icon: 'notifications-outline',
      label: 'Thông báo',
      hint: 'Cập nhật đơn hàng, biến động giá',
      onPress: () => navigation.navigate('Notifications'),
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
        {/* ---- Thẻ hồ sơ ----
            Khối màu mực như đầu trang chủ, chữ đại diện trên ô xanh ngọc: đọc như thẻ
            thành viên của cửa hàng, tách hẳn khỏi các nhóm menu trắng bên dưới. */}
        <Gradient colors={gradient.brand} style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitial(user.full_name)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>{user.full_name}</Text>
            <Text style={styles.email} numberOfLines={1}>{user.email ?? user.phone_number ?? '—'}</Text>
            <Text style={styles.since}>Thành viên từ {formatDateShort(user.created_at)}</Text>
          </View>
        </Gradient>

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
          <Fragment key={item.label}>
            {/* Vạch ngăn thụt vào sau ô biểu tượng, giống danh sách cài đặt của hệ
                điều hành — cột biểu tượng liền mạch, mắt dò theo cột chữ. */}
            {i > 0 ? <View style={styles.separator} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !!item.upcoming }}
              onPress={item.onPress}
              disabled={!item.onPress}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.rowIcon}>
                <Ionicons
                  name={item.icon}
                  size={19}
                  color={item.upcoming ? colors.textMuted : colors.ink}
                />
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
          </Fragment>
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
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  guestTitle: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.4 },
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
    paddingVertical: spacing.xl,
    borderRadius: radius.xl,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '900', color: colors.textInverse, letterSpacing: -0.5 },
  name: { fontSize: 19, fontWeight: '800', color: colors.textInverse, letterSpacing: -0.4 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.72)', marginTop: 3 },
  since: { fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginTop: 4 },

  group: { gap: spacing.sm },
  groupTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xs,
  },
  groupBody: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  // Mờ đi chứ không tô nền: hàng đầu/cuối tô nền sẽ lòi góc vuông ra ngoài mép bo
  // của thẻ (thẻ không bật overflow:hidden vì iOS sẽ cắt luôn bóng đổ).
  rowPressed: { opacity: 0.6 },
  // Thụt đúng bằng lề trái + ô biểu tượng (36) + khoảng cách.
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 36 + spacing.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 15, fontWeight: '600', color: colors.text, letterSpacing: -0.1 },
  rowLabelMuted: { color: colors.textSecondary },
  rowHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  soonTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
  },
  soonText: { fontSize: 10.5, fontWeight: '700', color: colors.textMuted },

  signOut: { marginTop: spacing.sm },
});
