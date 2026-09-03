// Viết đánh giá sản phẩm (POST /api/products/:id/reviews).
//
// Backend chặn ba lớp trước khi nhận đánh giá (product.service.ts createReview):
//   1. Phải đăng nhập.
//   2. Phải có đơn hàng trạng thái 'paid' chứa sản phẩm này.
//   3. Mỗi người chỉ đánh giá một lần cho một sản phẩm.
// App chỉ kiểm được lớp 1. Hai lớp sau cần dữ liệu app không có (danh sách đánh giá
// không kèm id người viết, và quét toàn bộ đơn hàng chỉ để mở một nút là quá đắt), nên
// cứ gửi rồi hiện nguyên văn thông báo 403 của backend.
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import ProductThumb from '../../components/ProductThumb';
import StarRating from '../../components/StarRating';
import TextField from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { productApi } from '../../api/products';
import { getErrorMessage } from '../../api/client';
import { colors, radius, shadow, spacing, tagPalette } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'WriteReview'>;

const MAX_TITLE = 255; // @MaxLength(255)
const MAX_CONTENT = 2000; // @MaxLength(2000)

export default function WriteReviewScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { user } = useAuth();

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const blocker = !user
    ? { icon: 'log-in-outline' as const, text: 'Vui lòng đăng nhập để viết đánh giá.', action: 'Đăng nhập' }
    : null;

  const submit = async () => {
    if (!user || sending) return;
    setSending(true);
    try {
      await productApi.createReview(params.productId, {
        rating,
        title: title.trim() || undefined,
        content: content.trim() || undefined,
      });
      Alert.alert('Cảm ơn bạn đã đánh giá!', 'Đánh giá của bạn đã được gửi.', [
        { text: 'Xong', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      // 403 của backend: chưa mua hàng, hoặc đã đánh giá sản phẩm này rồi.
      Alert.alert('Chưa gửi được đánh giá', getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen edges={[]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* ---- Sản phẩm đang đánh giá — tên/ảnh lấy từ tham số tuyến ---- */}
          <View style={styles.productRow}>
            <ProductThumb uri={params.productImage} icon={null} size={52} />
            <Text style={styles.productName} numberOfLines={2}>
              {params.productName}
            </Text>
          </View>

          {blocker ? (
            <View style={styles.blocker}>
              <Ionicons name={blocker.icon} size={20} color={colors.warning} />
              <View style={styles.flex}>
                <Text style={styles.blockerText}>{blocker.text}</Text>
                {blocker.action ? (
                  <AppButton
                    title={blocker.action}
                    variant="outline"
                    onPress={() => navigation.navigate('Login')}
                    style={styles.blockerBtn}
                  />
                ) : null}
              </View>
            </View>
          ) : (
            <>
              <Card title="Chấm điểm">
                <View style={styles.rateRow}>
                  <StarRating value={rating} onChange={setRating} size={30} />
                  <Text style={styles.rateValue}>{rating}/5</Text>
                </View>
              </Card>

              <Card title="Nhận xét">
                <View style={styles.form}>
                  <TextField
                    label="Tiêu đề (tuỳ chọn)"
                    value={title}
                    onChangeText={setTitle}
                    placeholder="VD: Sản phẩm tốt trong tầm giá"
                    maxLength={MAX_TITLE}
                  />
                  <View>
                    <TextField
                      label="Nội dung (tuỳ chọn)"
                      value={content}
                      onChangeText={setContent}
                      placeholder="Chia sẻ trải nghiệm của bạn…"
                      multiline
                      maxLength={MAX_CONTENT}
                      style={styles.contentInput}
                    />
                    <Text style={styles.counter}>
                      {content.length}/{MAX_CONTENT} ký tự
                    </Text>
                  </View>
                </View>
              </Card>

              <AppButton title="Gửi đánh giá" icon="send-outline" block loading={sending} onPress={submit} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.lg },

  // Sản phẩm đang đánh giá đặt trong thẻ trắng như mọi khối khác trên màn hình,
  // thay vì thả trực tiếp lên nền xám.
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    ...shadow.card,
  },
  productName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 20 },

  blocker: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: tagPalette.gold.bg,
    borderWidth: 1,
    borderColor: '#ffe58f',
  },
  blockerText: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20 },
  blockerBtn: { marginTop: spacing.md, alignSelf: 'flex-start' },

  rateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rateValue: { fontSize: 15, fontWeight: '700', color: colors.text },

  form: { gap: spacing.lg },
  contentInput: { minHeight: 96, textAlignVertical: 'top', paddingTop: spacing.sm },
  counter: { fontSize: 11.5, color: colors.textMuted, textAlign: 'right', marginTop: spacing.xs },
});
