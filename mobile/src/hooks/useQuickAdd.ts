// Thêm nhanh MỘT sản phẩm vào giỏ ngay từ thẻ sản phẩm (trang chủ, màn tìm kiếm,
// băng gợi ý) — không bắt người mua mở chi tiết rồi mới thêm được.
//
// Chưa đăng nhập thì đưa thẳng sang màn Đăng nhập: giỏ nằm trên máy chủ nên gọi API
// lúc này chỉ nhận về 401, hiện chuỗi lỗi đó ra thẻ sản phẩm là vô nghĩa.
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getErrorMessage } from '../api/client';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Trả về true khi đã vào giỏ — thẻ sản phẩm dựa vào đó để hiện dấu tick.
export function useQuickAdd(): (productId: string) => Promise<boolean> {
  const navigation = useNavigation<Nav>();
  const { isAuthenticated } = useAuth();
  const { add } = useCart();

  return useCallback(
    async (productId: string) => {
      if (!isAuthenticated) {
        navigation.navigate('Login');
        return false;
      }
      try {
        await add({ id: productId }, 1);
        return true;
      } catch (err) {
        Alert.alert('Chưa thêm được vào giỏ', getErrorMessage(err));
        return false;
      }
    },
    [isAuthenticated, add, navigation],
  );
}
