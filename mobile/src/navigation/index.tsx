import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';
import { Pressable, StyleSheet, View } from 'react-native';

import { useCart } from '../context/CartContext';
import { colors, radius, shadow, useTabBarHeight, tabBarContentHeight } from '../theme';
import type { RootStackParamList, TabParamList } from './types';

import HomeScreen from '../screens/home/HomeScreen';
import ProductsScreen from '../screens/products/ProductsScreen';
import ProductDetailScreen from '../screens/products/ProductDetailScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import CartScreen from '../screens/cart/CartScreen';
import CheckoutScreen from '../screens/checkout/CheckoutScreen';
import VoucherPickerScreen from '../screens/checkout/VoucherPickerScreen';
import OrderSuccessScreen from '../screens/checkout/OrderSuccessScreen';
import OrdersScreen from '../screens/orders/OrdersScreen';
import OrderDetailScreen from '../screens/orders/OrderDetailScreen';
import PriceAlertsScreen from '../screens/orders/PriceAlertsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import AccountScreen from '../screens/account/AccountScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import AddressBookScreen from '../screens/account/AddressBookScreen';
import AddressFormScreen from '../screens/account/AddressFormScreen';
import LocationPickerScreen from '../screens/account/LocationPickerScreen';
import ProfileScreen from '../screens/account/ProfileScreen';
import PreferencesScreen from '../screens/account/PreferencesScreen';
import ReviewsScreen from '../screens/products/ReviewsScreen';
import WriteReviewScreen from '../screens/products/WriteReviewScreen';
import PayosPaymentScreen from '../screens/checkout/PayosPaymentScreen';
import PaymentResultScreen from '../screens/checkout/PaymentResultScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Nút trợ lý AI ở giữa thanh tab được vẽ nổi lên — mục 3.1.b của tài liệu giới thiệu
// coi trò chuyện là giao diện chính của sản phẩm, không phải widget phụ như bản web.
function ChatTabIcon({ focused }: { focused: boolean }) {
  // Ô vuông bo màu mực nổi lên khỏi thanh tab; đang mở thì đổi sang xanh ngọc thương
  // hiệu — nút giữa là điểm nhấn của cả app, phải thấy ngay nó đang được chọn.
  return (
    <View style={[styles.chatBubble, focused && styles.chatBubbleActive]}>
      <Ionicons
        name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
        size={22}
        color={colors.textInverse}
      />
    </View>
  );
}

// Tab đang chọn dùng glyph đặc, tab khác dùng glyph nét — khác cả hình lẫn màu,
// người mù màu vẫn nhận ra tab hiện tại.
function tabIcon(name: string) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons
      name={(focused ? name : `${name}-outline`) as IoniconsIconName}
      size={size - 1}
      color={color}
    />
  );
}

function MainTabs() {
  const { itemCount } = useCart();
  // Đáy thanh tab đắp đúng inset của máy (home indicator / thanh gesture) thay vì
  // số cứng theo nền tảng — xem chú thích ở theme/index.ts.
  const tabBarHeight = useTabBarHeight();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: [
          styles.tabBar,
          { height: tabBarHeight, paddingBottom: tabBarHeight - tabBarContentHeight },
        ],
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Trang chủ',
          tabBarIcon: tabIcon('home'),
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          title: 'Sản phẩm',
          tabBarIcon: tabIcon('grid'),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Trợ lý AI',
          tabBarIcon: ({ focused }) => <ChatTabIcon focused={focused} />,
          tabBarLabelStyle: [styles.tabLabel, styles.chatLabel],
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          title: 'Giỏ hàng',
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarBadgeStyle: styles.badge,
          tabBarIcon: tabIcon('cart'),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Tài khoản',
          tabBarIcon: tabIcon('person'),
        }}
      />
    </Tab.Navigator>
  );
}

// Hai màn kết quả (đặt hàng thành công / kết quả thanh toán) tắt nút back mặc định:
// đơn đã tạo xong rồi, quay ngược về màn Đặt hàng hay màn quét QR đều vô nghĩa. Nhưng
// bỏ hẳn nút thì thanh tiêu đề không còn đường thoát nào — đặt lại một nút, bấm vào
// đưa về gốc ngăn xếp (các tab) thay vì lùi đúng một bước.
function HeaderExitButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Đóng"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.headerExit, pressed && styles.headerExitPressed]}
    >
      <Ionicons name="arrow-back" size={22} color={colors.text} />
    </Pressable>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { fontSize: 17, fontWeight: '700', color: colors.text },
          headerTintColor: colors.text,
          // iOS lấy tiêu đề màn TRƯỚC làm nhãn nút quay lại; màn 'Tabs' không đặt
          // tiêu đề nên nhãn rơi về tên route và hiện chữ "Tabs". Bỏ hẳn phần chữ,
          // chỉ để lại mũi tên — cùng một màn chi tiết mở được từ nhiều tab nên
          // không có nhãn nào đúng cho mọi đường vào.
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{ title: 'Chi tiết sản phẩm' }}
        />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Đặt hàng' }} />
        <Stack.Screen
          name="VoucherPicker"
          component={VoucherPickerScreen}
          options={{ title: 'Chọn mã giảm giá', presentation: 'modal' }}
        />
        <Stack.Screen
          name="OrderSuccess"
          component={OrderSuccessScreen}
          options={({ navigation }) => ({
            title: 'Đặt hàng thành công',
            headerBackVisible: false,
            headerLeft: () => <HeaderExitButton onPress={() => navigation.popToTop()} />,
          })}
        />
        <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Đơn hàng của tôi' }} />
        <Stack.Screen
          name="OrderDetail"
          component={OrderDetailScreen}
          options={{ title: 'Chi tiết đơn hàng' }}
        />
        <Stack.Screen
          name="PriceAlerts"
          component={PriceAlertsScreen}
          options={{ title: 'Theo dõi giá' }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: 'Thông báo' }}
        />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Đăng ký' }} />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ title: 'Quên mật khẩu' }}
        />
        <Stack.Screen name="AddressBook" component={AddressBookScreen} options={{ title: 'Sổ địa chỉ' }} />
        <Stack.Screen
          name="AddressForm"
          component={AddressFormScreen}
          options={({ route }) => ({ title: route.params?.addressId ? 'Sửa địa chỉ' : 'Thêm địa chỉ' })}
        />
        <Stack.Screen
          name="LocationPicker"
          component={LocationPickerScreen}
          options={{ title: 'Chọn trên bản đồ' }}
        />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Hồ sơ cá nhân' }} />
        <Stack.Screen
          name="Preferences"
          component={PreferencesScreen}
          options={{ title: 'Sở thích mua sắm' }}
        />
        <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ title: 'Đánh giá sản phẩm' }} />
        <Stack.Screen
          name="WriteReview"
          component={WriteReviewScreen}
          options={{ title: 'Viết đánh giá' }}
        />
        <Stack.Screen
          name="PayosPayment"
          component={PayosPaymentScreen}
          options={{ title: 'Thanh toán PayOS', headerBackVisible: false }}
        />
        <Stack.Screen
          name="PaymentResult"
          component={PaymentResultScreen}
          options={({ navigation }) => ({
            title: 'Kết quả thanh toán',
            headerBackVisible: false,
            headerLeft: () => <HeaderExitButton onPress={() => navigation.popToTop()} />,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  // React Navigation cho mỗi ô tab đúng phần chiều cao còn lại rồi để nhãn flexShrink.
  // Thiếu chỗ là nhãn bị bóp lại và cắt mất chân dấu tiếng Việt (dấu nằm dưới chữ).
  // Cần chừa tối thiểu: icon 24 + nhãn 17 + padding trong của ô 10 = 51.
  tabBar: {
    backgroundColor: colors.surface,
    // Thanh phẳng, chỉ một đường kẻ tóc phía trên — như thanh tab hệ thống, để nội
    // dung là thứ nổi bật chứ không phải khung điều hướng.
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
    paddingTop: 6,
    // height và paddingBottom đặt động trong MainTabs theo inset đáy của máy.
  },
  tabLabel: { fontSize: 11, lineHeight: 17, fontWeight: '600' },
  chatLabel: { marginTop: 2 },
  chatBubble: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    marginTop: -16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    // Viền trắng tách ô nổi khỏi mép thanh tab như một vết cắt.
    borderWidth: 3,
    borderColor: colors.surface,
    ...shadow.card,
  },
  chatBubbleActive: { backgroundColor: colors.primary },
  badge: { backgroundColor: colors.accent, fontSize: 10, fontWeight: '700' },
  headerExit: { padding: 4, marginLeft: -4, borderRadius: radius.pill },
  headerExitPressed: { backgroundColor: colors.bg },
});
