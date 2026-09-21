// UC-PROD-01 — Dạo trang chủ cửa hàng.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import ProductCard from '../../components/ProductCard';
import ProductThumb from '../../components/ProductThumb';
import SectionHeader from '../../components/SectionHeader';
import CategoryIcon from '../../components/CategoryIcon';
import Gradient from '../../components/Gradient';
import LoadState from '../../components/LoadState';
import VoucherTicket, { VOUCHER_WIDTH } from '../../components/VoucherTicket';
import { ProductGridSkeleton, ProductRailSkeleton, Skeleton } from '../../components/Skeleton';
import { useApi } from '../../hooks/useApi';
import { useQuickAdd } from '../../hooks/useQuickAdd';
import { categoryApi } from '../../api/categories';
import { productApi, type ProductListItem } from '../../api/products';
import { notificationApi } from '../../api/notifications';
import { discountApi, type DiscountCodeItem } from '../../api/discounts';
import { orderApi } from '../../api/orders';
import { useAuth } from '../../context/AuthContext';
import { colors, gradient, radius, shadow, spacing, tagPalette, useTabBarHeight } from '../../theme';
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL, formatVND } from '../../utils/format';
import { getItems } from '../../types';
import type { OrderStatus } from '../../types';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Gợi ý tìm kiếm: đợi ngừng gõ rồi mới gọi API, tối thiểu 2 ký tự, tối đa 6 dòng.
const SUGGEST_DEBOUNCE_MS = 350;
const SUGGEST_MIN_CHARS = 2;
const SUGGEST_LIMIT = 6;

// Băng ưu đãi chỉ lấy vài mã đầu — cả danh sách đã có ở màn Chọn mã lúc đặt hàng.
const VOUCHER_LIMIT = 8;

// Ô danh mục lấy màu theo vị trí trong danh sách. Backend không lưu màu cho danh mục,
// mà sáu ô cùng một màu cam nhạt thì cả lưới thành một mảng phẳng — xoay vòng bảng
// này cho mỗi ô một sắc riêng.
const CATEGORY_TINTS: { bg: string; fg: string }[] = [
  { bg: '#fff1e7', fg: '#e35410' },
  { bg: '#eef3ff', fg: '#3b6bef' },
  { bg: '#eafbf1', fg: '#20a05e' },
  { bg: '#f6efff', fg: '#7c46cf' },
  { bg: '#e7fbfa', fg: '#0f9b93' },
  { bg: '#fff8e3', fg: '#c88a06' },
];

// Đơn còn "đang chạy" — đáng nhắc ngay ở trang chủ để người mua theo dõi. Huỷ hay
// mô phỏng xong thì không còn gì để theo dõi nữa.
const ACTIVE_ORDER_STATUSES: OrderStatus[] = ['pending', 'paid', 'shipped'];
const ORDER_ICON: Partial<Record<OrderStatus, IoniconsIconName>> = {
  pending: 'receipt-outline',
  paid: 'card-outline',
  shipped: 'car-outline',
};

function greetingByHour(hour: number): string {
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  // Dải cam chạy lên sát đỉnh máy nên Screen không chừa vùng an toàn nữa; phần chừa
  // đó lấy đúng số đo của thiết bị và đắp vào paddingTop của chính dải cam.
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
  const { isAuthenticated, user } = useAuth();
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

  // Tên người Việt xếp họ trước, tên gọi sau — lời chào lấy từ cuối.
  const firstName = user?.full_name.trim().split(/\s+/).pop();
  const greeting = firstName ? `${greetingByHour(new Date().getHours())}, ${firstName}` : null;

  // Lưới 2 cột: trừ lề trái/phải và khoảng cách giữa hai cột.
  const cardWidth = useMemo(() => (width - spacing.lg * 2 - spacing.md) / 2, [width]);

  const openProduct = (productId: string) => navigation.navigate('ProductDetail', { productId });

  // Gõ từ khoá là hiện gợi ý sản phẩm ngay dưới thanh tìm kiếm; bấm Tìm thì vẫn sang
  // màn Sản phẩm với danh sách đầy đủ. Debounce + huỷ request cũ theo cùng cách màn
  // thêm địa chỉ (AddressFormScreen) đang làm với gợi ý địa chỉ.
  const [keyword, setKeyword] = useState('');
  const [suggestions, setSuggestions] = useState<ProductListItem[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestEmpty, setSuggestEmpty] = useState(false);
  // Bấm chọn/bấm Tìm là đóng panel, nhưng lượt gọi đang bay (từ khoá không đổi nên
  // không bị huỷ) vẫn có thể trả về sau đó và mở panel lại — cờ này chặn kết quả trễ,
  // gõ tiếp mới được gợi ý trở lại.
  const suggestClosed = useRef(false);

  useEffect(() => {
    suggestClosed.current = false;
    const term = keyword.trim();
    if (term.length < SUGGEST_MIN_CHARS) {
      setSuggestions([]);
      setSuggestEmpty(false);
      setSuggesting(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await productApi.list({ search: term, limit: SUGGEST_LIMIT }, controller.signal);
        if (suggestClosed.current) return;
        const items = getItems(res);
        setSuggestions(items);
        setSuggestEmpty(items.length === 0);
      } catch {
        // Gợi ý chỉ là tiện ích — lỗi mạng thì im lặng, thanh tìm kiếm vẫn dùng được.
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setSuggestEmpty(false);
      } finally {
        if (!controller.signal.aborted) setSuggesting(false);
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [keyword]);

  const closeSuggestions = () => {
    suggestClosed.current = true;
    setSuggestions([]);
    setSuggestEmpty(false);
    setSuggesting(false);
    Keyboard.dismiss();
  };

  const submitSearch = () => {
    closeSuggestions();
    navigation.navigate('Tabs', { screen: 'Products', params: { keyword: keyword.trim() } });
  };

  const pickSuggestion = (item: ProductListItem) => {
    closeSuggestions();
    navigation.navigate('ProductDetail', { productId: item.id });
  };

  const showSuggestPanel =
    keyword.trim().length >= SUGGEST_MIN_CHARS && (suggesting || suggestions.length > 0 || suggestEmpty);

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
        {/* ---- Đầu trang: dải cam mang nhận diện, chứa thương hiệu + ô tìm kiếm ----
            Chừa sẵn paddingBottom lớn để khối trợ lý AI phía dưới đè lên được. */}
        <Gradient colors={gradient.brand} angle="vertical" style={styles.hero}>
          {/* Hai vòng tròn trắng mờ làm dải cam có chiều sâu thay vì một mảng phẳng;
              Gradient tự cắt phần tràn ra ngoài. */}
          <View pointerEvents="none" style={[styles.heroOrb, styles.heroOrbLarge]} />
          <View pointerEvents="none" style={[styles.heroOrb, styles.heroOrbSmall]} />

          <View style={[styles.heroInner, { paddingTop: insets.top + spacing.sm }]}>
            <View style={styles.brandRow}>
              <View style={styles.logoMark}>
                <Ionicons name="flash" size={17} color={colors.textInverse} />
              </View>
              <View style={styles.brandText}>
                <Text style={styles.brandName}>NexTech</Text>
                {/* Đã đăng nhập thì dòng phụ là lời chào theo tên — trang chủ nhận ra
                    người quen thay vì lặp lại khẩu hiệu. */}
                <Text style={styles.brandTagline} numberOfLines={1}>
                  {greeting ?? 'Công nghệ chọn đúng nhu cầu'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'
                }
                onPress={() => navigation.navigate('Notifications')}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                hitSlop={6}
              >
                <Ionicons name="notifications-outline" size={21} color={colors.textInverse} />
                {unreadCount > 0 ? <View style={styles.dot} /> : null}
              </Pressable>
            </View>

            {/* Ô nhập thật, không phải nút mở tab Sản phẩm: gõ xong bấm Tìm là sang
                thẳng danh sách đã lọc theo từ khoá (tuyến Products nhận tham số
                `keyword`). Trước đây bấm vào chỉ chuyển tab rồi phải gõ lại. */}
            <View>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={colors.primary} />
                <TextInput
                  value={keyword}
                  onChangeText={setKeyword}
                  onSubmitEditing={submitSearch}
                  placeholder="Tìm laptop, điện thoại, tai nghe…"
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                  returnKeyType="search"
                  accessibilityLabel="Ô tìm sản phẩm"
                />
                {keyword ? (
                  <Pressable onPress={() => setKeyword('')} hitSlop={8} accessibilityLabel="Xoá từ khoá">
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>

              {/* Bảng gợi ý nằm trong luồng, hero tự giãn cao ra chứa nó — Gradient
                  cắt mọi thứ tràn ra ngoài (overflow hidden) nên không nổi đè được. */}
              {showSuggestPanel ? (
                <View style={styles.suggestPanel}>
                  {suggestions.map((item, i) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      onPress={() => pickSuggestion(item)}
                      style={({ pressed }) => [
                        styles.suggestRow,
                        i > 0 && styles.suggestRowBorder,
                        pressed && styles.suggestRowPressed,
                      ]}
                    >
                      <ProductThumb uri={item.primary_image} icon={null} size={36} />
                      <View style={styles.suggestBody}>
                        <Text style={styles.suggestName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.suggestPrice}>{formatVND(item.price)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                    </Pressable>
                  ))}

                  {suggesting && suggestions.length === 0 ? (
                    <View style={styles.suggestStatusRow}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.suggestStatusText}>Đang tìm sản phẩm…</Text>
                    </View>
                  ) : null}

                  {!suggesting && suggestEmpty ? (
                    <View style={styles.suggestStatusRow}>
                      <Ionicons name="search-outline" size={15} color={colors.textMuted} />
                      <Text style={styles.suggestStatusText}>Không tìm thấy sản phẩm phù hợp</Text>
                    </View>
                  ) : null}

                  {suggestions.length > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={submitSearch}
                      style={({ pressed }) => [styles.suggestAllRow, pressed && styles.suggestRowPressed]}
                    >
                      <Text style={styles.suggestAllText}>
                        Xem tất cả kết quả cho “{keyword.trim()}”
                      </Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        </Gradient>

        {/* ---- Mời dùng trợ lý AI: chức năng lõi tạo khác biệt (nhóm C) ----
            Lề trên âm để thẻ nằm đè lên mép dưới dải cam: đầu trang và phần thân
            khoá vào nhau thay vì xếp rời từng khối. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Tabs', { screen: 'Chat' })}
          style={({ pressed }) => [styles.aiBanner, pressed && styles.aiBannerPressed]}
        >
          <Gradient colors={gradient.brandSoft} style={styles.aiIcon}>
            <Ionicons name="chatbubble-ellipses" size={22} color={colors.primary} />
          </Gradient>
          <View style={styles.aiTextBox}>
            <Text style={styles.aiTitle}>Chưa biết chọn máy nào?</Text>
            <Text style={styles.aiDesc}>
              Mô tả nhu cầu và ngân sách, trợ lý sẽ gợi ý máy phù hợp.
            </Text>
          </View>
          <View style={styles.aiChevron}>
            <Ionicons name="arrow-forward" size={16} color={colors.textInverse} />
          </View>
        </Pressable>

        {/* ---- Đơn đang xử lý: lý do quay lại app của người vừa mua ---- */}
        {activeOrder ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Đơn hàng đang ${ORDER_STATUS_LABEL[activeOrder.status]}, xem chi tiết`}
            onPress={() => navigation.navigate('OrderDetail', { orderId: activeOrder.id })}
            style={({ pressed }) => [styles.orderStrip, pressed && styles.orderStripPressed]}
          >
            <View
              style={[
                styles.orderIcon,
                { backgroundColor: (tagPalette[ORDER_STATUS_COLOR[activeOrder.status]] ?? tagPalette.default).bg },
              ]}
            >
              <Ionicons
                name={ORDER_ICON[activeOrder.status] ?? 'receipt-outline'}
                size={18}
                color={(tagPalette[ORDER_STATUS_COLOR[activeOrder.status]] ?? tagPalette.default).fg}
              />
            </View>
            <View style={styles.orderBody}>
              <Text style={styles.orderTitle} numberOfLines={1}>
                Đơn #{activeOrder.id.slice(0, 8).toUpperCase()} · {ORDER_STATUS_LABEL[activeOrder.status]}
              </Text>
              <Text style={styles.orderSub} numberOfLines={1}>
                {activeOrder.product_name ?? `${activeOrder.item_count} sản phẩm`}
              </Text>
            </View>
            <Text style={styles.orderTotal}>{formatVND(activeOrder.total)}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
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
            <View style={styles.categoryRow}>
              {data.categories.map((cat, i) => {
                const tint = CATEGORY_TINTS[i % CATEGORY_TINTS.length];
                return (
                  <Pressable
                    key={cat.id}
                    accessibilityRole="button"
                    onPress={() =>
                      navigation.navigate('Tabs', { screen: 'Products', params: { categoryId: cat.id } })
                    }
                    style={styles.categoryItem}
                  >
                    {({ pressed }) => (
                      <>
                        <View
                          style={[
                            styles.categoryIcon,
                            { backgroundColor: tint.bg },
                            pressed && styles.categoryIconPressed,
                          ]}
                        >
                          <CategoryIcon icon={cat.icon} size={26} color={tint.fg} />
                        </View>
                        <Text style={styles.categoryLabel} numberOfLines={2}>
                          {cat.name}
                        </Text>
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>

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

            {/* ---- Thương hiệu ----
                Backend chỉ trả tên (GET /products/brands, string[]), không có logo —
                thẻ dùng monogram chữ cái đầu, xoay vòng bảng màu của lưới danh mục
                để cả trang chung một hoà sắc. */}
            <SectionHeader title="Thương hiệu" />
            <View style={styles.brandGrid}>
              {data.brands.map((brand, i) => {
                const tint = CATEGORY_TINTS[i % CATEGORY_TINTS.length];
                return (
                  <Pressable
                    key={brand}
                    accessibilityRole="button"
                    onPress={() =>
                      navigation.navigate('Tabs', { screen: 'Products', params: { brand } })
                    }
                    style={({ pressed }) => [
                      styles.brandCard,
                      { width: cardWidth },
                      pressed && styles.brandCardPressed,
                    ]}
                  >
                    <View style={[styles.brandMark, { backgroundColor: tint.bg }]}>
                      <Text style={[styles.brandMarkText, { color: tint.fg }]}>
                        {brand.trim()[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={styles.brandBody}>
                      <Text style={styles.brandCardName} numberOfLines={1}>
                        {brand}
                      </Text>
                      <Text style={styles.brandCardHint}>Xem sản phẩm</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </Pressable>
                );
              })}
            </View>
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

// Khung giữ chỗ trong lúc chờ năm lời gọi API: giữ đúng thứ tự danh mục → băng ưu
// đãi → băng ngang → lưới, để trang không nhảy khi dữ liệu về.
function HomeSkeleton({ cardWidth }: { cardWidth: number }) {
  return (
    <View>
      <View style={styles.categoryRow}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={styles.categoryItem}>
            <Skeleton width={56} height={56} round={radius.xl} />
            <Skeleton width={48} height={10} round={radius.sm} />
          </View>
        ))}
      </View>
      <View style={styles.skeletonSection}>
        <Skeleton width={130} height={18} round={radius.sm} style={styles.skeletonTitle} />
        <View style={[styles.skeletonRow, styles.skeletonRail]}>
          <Skeleton width={VOUCHER_WIDTH} height={84} round={radius.lg} />
          <Skeleton width={VOUCHER_WIDTH} height={84} round={radius.lg} />
        </View>
      </View>
      <View style={styles.skeletonSection}>
        <Skeleton width={140} height={18} round={radius.sm} style={styles.skeletonTitle} />
        <View style={styles.skeletonRow}>
          <ProductRailSkeleton />
        </View>
      </View>
      <View style={styles.skeletonSection}>
        <Skeleton width={110} height={18} round={radius.sm} style={styles.skeletonTitle} />
        <View style={styles.skeletonRow}>
          <ProductGridSkeleton width={cardWidth} />
        </View>
      </View>
    </View>
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

  hero: {
    paddingBottom: spacing.xxl + spacing.xl,
    borderBottomLeftRadius: radius.xl + spacing.sm,
    borderBottomRightRadius: radius.xl + spacing.sm,
  },
  heroOrb: {
    position: 'absolute',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroOrbLarge: { width: 200, height: 200, top: -80, right: -60 },
  heroOrbSmall: { width: 110, height: 110, top: 30, right: 70, backgroundColor: 'rgba(255,255,255,0.07)' },
  heroInner: { paddingHorizontal: spacing.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    // Trắng mờ trên nền cam: giữ được khối logo mà không cần thêm màu thứ ba.
    backgroundColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { flex: 1 },
  brandName: { fontSize: 20, fontWeight: '800', color: colors.textInverse, letterSpacing: -0.4 },
  brandTagline: { fontSize: 12, color: '#ffe6d5', marginTop: 1 },
  iconBtn: { padding: 7, borderRadius: radius.pill },
  iconBtnPressed: { backgroundColor: 'rgba(255,255,255,0.2)' },
  dot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 46,
    marginTop: spacing.sm,
    ...shadow.float,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 0 },

  suggestPanel: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  suggestRowPressed: { backgroundColor: colors.surfaceAlt },
  suggestBody: { flex: 1 },
  suggestName: { fontSize: 13.5, color: colors.text, fontWeight: '600' },
  suggestPrice: { fontSize: 12.5, color: colors.primary, fontWeight: '700', marginTop: 1 },
  suggestStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  suggestStatusText: { fontSize: 12.5, color: colors.textMuted },
  suggestAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  suggestAllText: { fontSize: 13, fontWeight: '700', color: colors.primary },

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
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTextBox: { flex: 1, gap: 2 },
  aiTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  aiDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  aiChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Dải đơn đang xử lý: thẻ gọn một dòng, cùng lề với thẻ trợ lý AI phía trên.
  orderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  orderStripPressed: { backgroundColor: colors.surfaceAlt },
  orderIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBody: { flex: 1, gap: 1 },
  orderTitle: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  orderSub: { fontSize: 12, color: colors.textMuted },
  orderTotal: { fontSize: 13.5, fontWeight: '800', color: colors.primary },

  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  categoryItem: { width: '33.333%', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconPressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  categoryLabel: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 17 },

  railList: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  brandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  brandCardPressed: { backgroundColor: colors.primarySoft },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { fontSize: 17, fontWeight: '800' },
  brandBody: { flex: 1 },
  brandCardName: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  brandCardHint: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  skeletonSection: { paddingBottom: spacing.xl },
  skeletonTitle: { marginLeft: spacing.lg, marginBottom: spacing.md },
  skeletonRow: { paddingHorizontal: spacing.lg },
  skeletonRail: { flexDirection: 'row', gap: spacing.md },
});
