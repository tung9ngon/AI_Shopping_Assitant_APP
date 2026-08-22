import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';

import { useCart } from '../context/CartContext';
import { colors, shadow, tabBarHeight } from '../theme';
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
import AccountScreen from '../screens/account/AccountScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Nút trợ lý AI ở giữa thanh tab được vẽ nổi lên — mục 3.1.b của tài liệu giới thiệu
// coi trò chuyện là giao diện chính của sản phẩm, không phải widget phụ như bản web.
function ChatTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.chatBubble, focused && styles.chatBubbleActive]}>
      <Ionicons name="sparkles" size={22} color={colors.textInverse} />
    </View>
  );
}

function MainTabs() {
  const { itemCount } = useCart();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          title: 'Sản phẩm',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
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
          tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { fontSize: 16, fontWeight: '700', color: colors.text },
          headerTintColor: colors.text,
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
          options={{ title: 'Đặt hàng thành công', headerBackVisible: false }}
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
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Đăng ký' }} />
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
    borderTopColor: colors.border,
    height: tabBarHeight,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 30 : 8,
  },
  tabLabel: { fontSize: 11, lineHeight: 17, fontWeight: '600' },
  chatLabel: { marginTop: 2 },
  chatBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginTop: -14,
    backgroundColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  chatBubbleActive: { backgroundColor: colors.primary },
  badge: { backgroundColor: colors.primary, fontSize: 10 },
});
