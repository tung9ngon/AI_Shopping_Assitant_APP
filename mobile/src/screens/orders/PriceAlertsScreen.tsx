// UC-ALERT-02 — Quản lý danh sách cảnh báo giá.
//
// Bản web chỉ báo được qua email (cron quét mỗi 30 giây rồi gửi mail), có thể vài ngày
// sau người dùng mới đọc. Trên app, kênh 'app' của bảng notifications mới dùng được —
// phần đẩy thông báo thuộc UC-MOB-01, làm ở vòng sau.
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import EmptyState from '../../components/EmptyState';
import ProductThumb from '../../components/ProductThumb';
import Tag from '../../components/Tag';
import { colors, radius, shadow, spacing } from '../../theme';
import { formatVND } from '../../utils/format';
import { mockPriceAlerts } from '../../mocks/data';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PriceAlertsScreen() {
  const navigation = useNavigation<Nav>();
  const [alerts, setAlerts] = useState(mockPriceAlerts);

  const removeAlert = (id: string) => {
    Alert.alert('Xoá cảnh báo', 'Bạn sẽ không được báo khi sản phẩm này giảm giá nữa.', [
      { text: 'Giữ lại', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => setAlerts((prev) => prev.filter((a) => a.id !== id)),
      },
    ]);
  };

  return (
    <Screen edges={[]}>
      <View style={styles.banner}>
        <Ionicons name="notifications-outline" size={18} color={colors.primary} />
        <Text style={styles.bannerText}>
          Hệ thống quét giá mỗi 30 giây. Giá chạm mức bạn đặt là báo ngay.
        </Text>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="Chưa theo dõi sản phẩm nào"
            description="Vào trang chi tiết sản phẩm và đặt giá mục tiêu để được báo khi giảm giá."
            actionTitle="Xem sản phẩm"
            onAction={() => navigation.navigate('Tabs', { screen: 'Products' })}
          />
        }
        renderItem={({ item }) => {
          const current = Number(item.product?.price ?? 0);
          const gap = current - item.target_price;
          const reached = gap <= 0;

          return (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                item.product ? navigation.navigate('ProductDetail', { productId: item.product.id }) : undefined
              }
              style={styles.card}
            >
              <ProductThumb uri={null} icon={item.product?.category?.icon} size={60} />

              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.product?.name ?? 'Sản phẩm'}
                </Text>

                <View style={styles.priceRow}>
                  <Text style={styles.current}>{formatVND(current)}</Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
                  <Text style={styles.target}>{formatVND(item.target_price)}</Text>
                </View>

                {reached ? (
                  <Tag label="Đã chạm giá mục tiêu" color="green" />
                ) : (
                  <Text style={styles.gap}>Còn cách {formatVND(gap)}</Text>
                )}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xoá cảnh báo"
                onPress={() => removeAlert(item.id)}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primarySoft,
  },
  bannerText: { flex: 1, fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 },

  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  body: { flex: 1, gap: spacing.xs },
  name: { fontSize: 13.5, color: colors.text, lineHeight: 19 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  current: { fontSize: 13, color: colors.textMuted, textDecorationLine: 'line-through' },
  target: { fontSize: 14, fontWeight: '700', color: colors.primary },
  gap: { fontSize: 12, color: colors.textMuted },
});
