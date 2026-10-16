// UC-PROD-01 — Dạo trang chủ cửa hàng.
import { useCallback, useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import ProductCard from '../../components/ProductCard';
import SectionHeader from '../../components/SectionHeader';
import LoadState from '../../components/LoadState';
import VoucherTicket, { VOUCHER_WIDTH } from '../../components/VoucherTicket';
import { useApi } from '../../hooks/useApi';
import { useQuickAdd } from '../../hooks/useQuickAdd';
import { categoryApi } from '../../api/categories';
import { productApi } from '../../api/products';
import { notificationApi } from '../../api/notifications';
import { discountApi, type DiscountCodeItem } from '../../api/discounts';
import { orderApi } from '../../api/orders';
import { useAuth } from '../../context/AuthContext';
import { colors, gradient, spacing, useTabBarHeight } from '../../theme';
import { getItems } from '../../types';
import type { OrderStatus } from '../../types';
import type { RootStackParamList } from '../../navigation/types';
import HomeHero from './HomeHero';
import HomeSearch from './HomeSearch';
import AiBanner from './AiBanner';
import ActiveOrderStrip from './ActiveOrderStrip';
import CategoryGrid from './CategoryGrid';
import BrandGrid from './BrandGrid';
import NeedStarter from './NeedStarter';
import HomeSkeleton from './HomeSkeleton';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Băng ưu đãi chỉ lấy vài mã đầu — cả danh sách đã có ở màn Chọn mã lúc đặt hàng.
const VOUCHER_LIMIT = 8;

// Đơn còn "đang chạy" — đáng nhắc ngay ở trang chủ để người mua theo dõi. Huỷ hay
// mô phỏng xong thì không còn gì để theo dõi nữa.
const ACTIVE_ORDER_STATUSES: OrderStatus[] = ['pending', 'paid', 'shipped'];

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const quickAdd = useQuickAdd();

  // Năm nguồn cho trang chủ, gọi song song để chỉ chờ một lượt.
  const { data, loading, error, reload } = useApi(
    () =>
      Promise.all([
        categoryApi.list(),
        productApi.list({ sort: 'newest', limit: 6 }),
        productApi.list({ sort: 'rating_desc', limit: 6 }),
        productApi.brands(),
        // Mã giảm giá là phần thêm — hỏng thì trang chủ vẫn hiện, băng ưu đãi ẩn đi
        // chứ không kéo cả trang về màn lỗi.
        Promise.all([discountApi.listOrderCodes(), discountApi.listFreeshipCodes()])
          .then(([order, ship]) => [...order, ...ship].slice(0, VOUCHER_LIMIT))
          .catch((): DiscountCodeItem[] => []),
      ]).then(([categories, newest, topRated, brands, vouchers]) => ({
        categories,
        newest: getItems(newest),
        topRated: getItems(topRated),
        brands,
        vouchers,
      })),
    [],
  );

  // Chấm đỏ trên nút chuông phải phản ánh số thật, không phải chấm vẽ cứng như
  // trước. Tab Home không unmount nên phải nạp lại mỗi lần quay về, nếu không đọc
  // xong thông báo rồi chấm vẫn còn.
  const { isAuthenticated } = useAuth();
  const unread = useApi(
    (signal) =>
      isAuthenticated ? notificationApi.unreadCount(signal) : Promise.resolve({ count: 0 }),
    [isAuthenticated],
  );
  const unreadCount = unread.data?.count ?? 0;

  // Đơn gần nhất còn đang xử lý/giao — nhắc ngay đầu trang. Backend xếp mới nhất
  // trước nên chỉ cần vài đơn đầu. Cùng lý do với chuông: nạp lại mỗi lần về tab.
  const recentOrders = useApi(
    () => (isAuthenticated ? orderApi.list({ limit: 5 }) : Promise.resolve(null)),
    [isAuthenticated],
  );
  const activeOrder = recentOrders.data
    ? (getItems(recentOrders.data).find((o) => ACTIVE_ORDER_STATUSES.includes(o.status)) ?? null)
    : null;

  const reloadUnread = unread.reload;
  const reloadOrders = recentOrders.reload;
  useFocusEffect(
    useCallback(() => {
      reloadUnread();
      reloadOrders();
    }, [reloadUnread, reloadOrders]),
  );

  // Lưới 2 cột: trừ lề trái/phải và khoảng cách giữa hai cột.
  const cardWidth = useMemo(() => (width - spacing.lg * 2 - spacing.md) / 2, [width]);

  const openProduct = (productId: string) => navigation.navigate('ProductDetail', { productId });

  return (
    <Screen edges={[]} style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        // Bấm được vào dòng gợi ý ngay khi bàn phím còn mở, không phải chạm hai lần.
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: tabBarHeight + spacing.lg }}
        // Tab Home không bao giờ unmount nên dữ liệu chỉ nạp một lần lúc mở app —
        // kéo xuống để làm mới là đường duy nhất cập nhật giá/hàng mới.
        refreshControl={
          <RefreshControl
            refreshing={loading && data != null}
            onRefresh={reload}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <HomeHero
          unreadCount={unreadCount}
          onOpenNotifications={() => navigation.navigate('Notifications')}
        >
          <HomeSearch
            onSubmit={(keyword) =>
              navigation.navigate('Tabs', { screen: 'Products', params: { keyword } })
            }
            onPick={(item) => openProduct(item.id)}
          />
        </HomeHero>

        <AiBanner onPress={() => navigation.navigate('Tabs', { screen: 'Chat' })} />

        {activeOrder ? (
          <ActiveOrderStrip
            order={activeOrder}
            onPress={() => navigation.navigate('OrderDetail', { orderId: activeOrder.id })}
          />
        ) : null}

        {!data ? (
          loading ? (
            <HomeSkeleton cardWidth={cardWidth} />
          ) : (
            <LoadState loading={false} error={error} onRetry={reload} />
          )
        ) : (
          <>
            {/* ---- Danh mục ---- */}
            <CategoryGrid
              categories={data.categories}
              onPress={(categoryId) =>
                navigation.navigate('Tabs', { screen: 'Products', params: { categoryId } })
              }
            />

            {/* ---- Bắt đầu theo nhu cầu: lối vào trợ lý theo nhóm người dùng ---- */}
            <SectionHeader
              title="Bắt đầu theo nhu cầu"
              subtitle="Chọn tình huống, trợ lý hỏi thêm rồi gợi ý"
            />
            <NeedStarter
              onPick={(prompt) => navigation.navigate('Tabs', { screen: 'Chat', params: { prompt } })}
            />

            {/* ---- Ưu đãi đang có: mã thật từ /discount-codes ----
                Bấm là đi mua sắm; mã được chọn ở bước Đặt hàng. */}
            {data.vouchers.length > 0 ? (
              <>
                <SectionHeader
                  title="Ưu đãi đang có"
                  subtitle="Chọn mã ở bước đặt hàng để được giảm"
                />
                <FlatList
                  horizontal
                  data={data.vouchers}
                  keyExtractor={(v) => v.code}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.railList}
                  snapToInterval={VOUCHER_WIDTH + spacing.md}
                  decelerationRate="fast"
                  renderItem={({ item }) => (
                    <VoucherTicket
                      voucher={item}
                      onPress={() =>
                        navigation.navigate('Tabs', { screen: 'Products', params: { sort: 'newest' } })
                      }
                    />
                  )}
                />
              </>
            ) : null}

            {/* ---- Đánh giá cao nhất ----
                Bản dựng giao diện có khối "Deal hot" kèm giá gốc gạch ngang, nhưng
                backend không lưu giá gốc/khuyến mãi nên không có nguồn để hiện. Đổi
                sang xếp theo điểm đánh giá — dữ liệu có thật. */}
            <SectionHeader
              title="Đánh giá cao nhất"
              subtitle="Xếp theo điểm người mua chấm"
              actionLabel="Xem tất cả"
              onAction={() =>
                navigation.navigate('Tabs', { screen: 'Products', params: { sort: 'rating_desc' } })
              }
            />
            <FlatList
              horizontal
              data={data.topRated}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.railList}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  width={160}
                  onPress={() => openProduct(item.id)}
                  onAdd={quickAdd}
                />
              )}
            />

            {/* ---- Sản phẩm mới ---- */}
            <SectionHeader
              title="Sản phẩm mới"
              subtitle="Vừa lên kệ"
              actionLabel="Xem tất cả"
              onAction={() =>
                navigation.navigate('Tabs', { screen: 'Products', params: { sort: 'newest' } })
              }
            />
            <View style={styles.grid}>
              {data.newest.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  width={cardWidth}
                  onPress={() => openProduct(p.id)}
                  onAdd={quickAdd}
                />
              ))}
            </View>

            {/* ---- Thương hiệu ---- */}
            <SectionHeader title="Thương hiệu" />
            <BrandGrid
              brands={data.brands}
              cardWidth={cardWidth}
              onPress={(brand) =>
                navigation.navigate('Tabs', { screen: 'Products', params: { brand } })
              }
            />
          </>
        )}
      </ScrollView>

      {/* Màn hình này bỏ vùng an toàn phía trên để dải cam chạm đỉnh máy, nên nội
          dung cuộn lên sẽ lọt vào sau đồng hồ/sóng. Dải màu đặc phủ đúng phần đó,
          lấy màu chặn đầu của dải cam — dải cam đổ dọc nên ở mép trên nó đúng một
          màu, ghép vào không thấy đường nối. */}
      <View
        pointerEvents="none"
        style={[styles.statusStrip, { height: insets.top }]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  statusStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: gradient.brand[0],
  },

  railList: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
