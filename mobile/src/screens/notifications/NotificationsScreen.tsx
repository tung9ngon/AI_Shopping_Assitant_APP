// Trung tâm thông báo trong app (GET /api/notifications).
//
// Kênh 'app' của bảng notifications — thứ bản web không có, ở web mọi cảnh báo đều đi
// qua email. Backend hiện mới sinh bản ghi ở một luồng: đặt hàng thành công
// (type 'order_update', kèm data.order_id); các loại còn lại chưa có nguồn sinh.
import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import EmptyState from '../../components/EmptyState';
import LoadState from '../../components/LoadState';
import { notificationApi, type NotificationItem, type NotificationType } from '../../api/notifications';
import { getErrorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, shadow, spacing, tagPalette } from '../../theme';
import { formatDate } from '../../utils/format';
import { getItems } from '../../types';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PAGE_LIMIT = 30;

// Mỗi loại một biểu tượng + sắc riêng, để lướt danh sách là phân biệt được ngay.
// Sắc lấy từ token: giá giảm dùng đỏ gạch của ưu đãi, gợi ý dùng xanh ngọc thương
// hiệu, đơn hàng/ khuyến mãi mượn cặp nền-chữ đã hạ bão hoà của tagPalette.
const TYPE_VIEW: Record<NotificationType, { icon: IoniconsIconName; bg: string; fg: string }> = {
  price_alert: { icon: 'pricetag-outline', bg: colors.accentSoft, fg: colors.accent },
  deal: { icon: 'flame-outline', bg: tagPalette.gold.bg, fg: tagPalette.gold.fg },
  recommendation: { icon: 'thumbs-up-outline', bg: colors.primarySoft, fg: colors.primary },
  order_update: { icon: 'cube-outline', bg: tagPalette.blue.bg, fg: tagPalette.blue.fg },
  system: { icon: 'information-circle-outline', bg: colors.surfaceAlt, fg: colors.textSecondary },
};

export default function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { isAuthenticated, restoring } = useAuth();
  const [marking, setMarking] = useState(false);

  const page = useApi(
    (signal) =>
      isAuthenticated
        ? notificationApi.list({ limit: PAGE_LIMIT }, signal)
        : Promise.resolve({ items: [], total: 0, page: 1, limit: PAGE_LIMIT }),
    [isAuthenticated],
  );

  const items = page.data ? getItems(page.data) : [];
  const unread = items.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    if (marking) return;
    setMarking(true);
    try {
      await notificationApi.markAllRead();
      page.reload();
    } catch (err) {
      Alert.alert('Chưa đánh dấu được', getErrorMessage(err));
    } finally {
      setMarking(false);
    }
  };

  // Nút "Đọc tất cả" nằm ở thanh tiêu đề, chỉ hiện khi thật sự có gì chưa đọc.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        unread > 0 ? (
          <Pressable onPress={markAllRead} hitSlop={8} accessibilityRole="button">
            {marking ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.headerAction}>Đọc tất cả</Text>
            )}
          </Pressable>
        ) : null,
    });
    // markAllRead tạo mới mỗi lần render; phần thay đổi thật nằm ở hai giá trị dưới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, unread, marking]);

  // Bấm vào một thông báo: đánh dấu đã đọc rồi mở đúng thứ nó nói tới, nếu trường
  // `data` có kèm id. Lỗi đánh dấu không được chặn đường đi tiếp.
  const openItem = async (item: NotificationItem) => {
    if (!item.is_read) {
      try {
        await notificationApi.markRead(item.id);
        page.reload();
      } catch {
        // Đánh dấu hỏng thì thôi, lần mở sau thử lại.
      }
    }

    const orderId = typeof item.data?.order_id === 'string' ? item.data.order_id : null;
    const productId = typeof item.data?.product_id === 'string' ? item.data.product_id : null;
    if (orderId) navigation.navigate('OrderDetail', { orderId });
    else if (productId) navigation.navigate('ProductDetail', { productId });
  };

  if (restoring) {
    return (
      <Screen edges={[]}>
        <LoadState loading error={null} onRetry={page.reload} />
      </Screen>
    );
  }

  if (!isAuthenticated) {
    return (
      <Screen edges={[]}>
        <EmptyState
          icon="person-outline"
          title="Bạn chưa đăng nhập"
          description="Thông báo gắn với tài khoản của bạn. Đăng nhập để xem."
          actionTitle="Đăng nhập"
          onAction={() => navigation.navigate('Login')}
        />
      </Screen>
    );
  }

  if (!page.data) {
    return (
      <Screen edges={[]}>
        <LoadState loading={page.loading} error={page.error} onRetry={page.reload} />
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        refreshing={page.loading}
        onRefresh={page.reload}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="Chưa có thông báo nào"
            description="Cập nhật đơn hàng, biến động giá và gợi ý dành cho bạn sẽ hiện ở đây."
          />
        }
        renderItem={({ item }) => {
          const view = TYPE_VIEW[item.type] ?? TYPE_VIEW.system;
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => openItem(item)}
              style={({ pressed }) => [
                styles.card,
                !item.is_read && styles.cardUnread,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={[styles.icon, { backgroundColor: view.bg }]}>
                <Ionicons name={view.icon} size={20} color={view.fg} />
              </View>
              <View style={styles.body}>
                <Text style={[styles.title, !item.is_read && styles.titleUnread]} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.body ? (
                  <Text style={styles.desc} numberOfLines={3}>
                    {item.body}
                  </Text>
                ) : null}
                <Text style={styles.time}>{formatDate(item.created_at)}</Text>
              </View>
              {!item.is_read ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerAction: { fontSize: 14, fontWeight: '600', color: colors.primary },

  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  // Chưa đọc: chấm đỏ gạch + tiêu đề đậm, viền thẻ đậm hơn một nấc. Không dùng vạch
  // màu ở mép trái — vạch dày trên thẻ bo góc lớn bị uốn cong theo góc, trông lệch.
  cardUnread: { borderColor: colors.borderStrong },
  cardPressed: { backgroundColor: colors.surfaceAlt },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 14, color: colors.textSecondary, lineHeight: 19 },
  titleUnread: { color: colors.text, fontWeight: '700' },
  desc: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
  time: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: spacing.sm,
  },
});
