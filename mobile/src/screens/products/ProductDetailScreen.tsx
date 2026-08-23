// UC-PROD-03 — Xem chi tiết sản phẩm. Kèm lối vào UC-ALERT-01 (đặt cảnh báo giá).
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import ProductThumb from '../../components/ProductThumb';
import QuantityStepper from '../../components/QuantityStepper';
import Rating from '../../components/Rating';
import TextField from '../../components/TextField';
import Card from '../../components/Card';
import { useCart } from '../../context/CartContext';
import { colors, radius, shadow, spacing } from '../../theme';
import { formatVND } from '../../utils/format';
import { mockProducts } from '../../mocks/data';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ProductDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { productId } = useRoute<RouteProp<RootStackParamList, 'ProductDetail'>>().params;
  const { width } = useWindowDimensions();
  const { add } = useCart();

  const product = useMemo(() => mockProducts.find((p) => p.id === productId), [productId]);
  const [quantity, setQuantity] = useState(1);
  const [alertOpen, setAlertOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <Screen edges={[]}>
        <Text style={styles.notFound}>Không tìm thấy sản phẩm.</Text>
      </Screen>
    );
  }

  const price = Number(product.price);

  const handleAdd = () => {
    add(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleBuyNow = () => {
    add(product, quantity);
    navigation.navigate('Checkout');
  };

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.gallery}>
          <ProductThumb uri={null} icon={product.category?.icon} size={width * 0.62} />
        </View>

        <View style={styles.block}>
          <Text style={styles.brand}>{product.brand ?? '—'}</Text>
          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.metaRow}>
            <Rating value={product.rating} count={128} size={14} />
            <View style={styles.divider} />
            <Text style={styles.stock}>Còn hàng</Text>
          </View>

          <Text style={styles.price}>{formatVND(price)}</Text>

          {product.tags?.length ? (
            <View style={styles.tagRow}>
              {product.tags.map((t) => (
                <View key={t.id} style={styles.tag}>
                  <Text style={styles.tagText}>{t.name ?? t.tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Số lượng</Text>
            <QuantityStepper value={quantity} onChange={setQuantity} />
          </View>

          {/* Lối vào UC-ALERT-01: đồ điện tử đắt tiền, người mua hay chờ giảm giá */}
          <Pressable
            accessibilityRole="button"
            onPress={() => setAlertOpen(true)}
            style={styles.alertRow}
          >
            <Ionicons name="notifications-outline" size={18} color={colors.primary} />
            <Text style={styles.alertText}>Báo tôi khi sản phẩm này giảm giá</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </View>

        <Card title="Mô tả" style={styles.card}>
          <Text style={styles.description}>{product.description ?? 'Chưa có mô tả.'}</Text>
        </Card>

        {product.specs?.length ? (
          <Card title="Thông số kỹ thuật" style={styles.card}>
            {product.specs.map((s, i) => (
              <View key={s.id} style={[styles.specRow, i > 0 && styles.specRowBorder]}>
                <Text style={styles.specKey}>{s.spec_key}</Text>
                <Text style={styles.specValue}>
                  {s.spec_value}
                  {s.spec_unit ? ` ${s.spec_unit}` : ''}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>

      {/* ---- Thanh hành động cố định dưới màn hình ---- */}
      <View style={styles.actionBar}>
        <AppButton
          title={added ? 'Đã thêm' : 'Thêm vào giỏ'}
          icon={added ? 'checkmark' : 'cart-outline'}
          variant="outline"
          onPress={handleAdd}
          style={styles.flexBtn}
        />
        <AppButton title="Mua ngay" onPress={handleBuyNow} style={styles.flexBtn} />
      </View>

      {/* ---- UC-ALERT-01: đặt giá mục tiêu ---- */}
      <Modal visible={alertOpen} transparent animationType="fade" onRequestClose={() => setAlertOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAlertOpen(false)} />
        <View style={styles.dialogWrap} pointerEvents="box-none">
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Theo dõi giá</Text>
            <Text style={styles.dialogDesc}>
              Giá hiện tại {formatVND(price)}. Khi giá xuống tới mức bạn đặt, hệ thống sẽ báo ngay
              cho bạn.
            </Text>
            <TextField
              label="Giá mục tiêu (đ)"
              icon="pricetag-outline"
              keyboardType="number-pad"
              value={targetPrice}
              onChangeText={setTargetPrice}
              placeholder={String(Math.round(price * 0.9))}
            />
            <View style={styles.dialogActions}>
              <AppButton title="Huỷ" variant="ghost" onPress={() => setAlertOpen(false)} style={styles.flexBtn} />
              <AppButton
                title="Đặt cảnh báo"
                onPress={() => {
                  setAlertOpen(false);
                  setTargetPrice('');
                }}
                style={styles.flexBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 110 },
  notFound: { padding: spacing.xl, color: colors.textMuted },

  gallery: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  block: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  brand: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.4 },
  name: { fontSize: 19, fontWeight: '700', color: colors.text, lineHeight: 26 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  divider: { width: 1, height: 12, backgroundColor: colors.border },
  stock: { fontSize: 13, color: colors.success, fontWeight: '600' },
  price: { fontSize: 26, fontWeight: '800', color: colors.primary, marginTop: spacing.xs },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
  },
  tagText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  qtyLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  alertText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.primary },

  card: { marginHorizontal: spacing.lg, marginTop: spacing.md },
  description: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, gap: spacing.lg },
  specRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  specKey: { fontSize: 14, color: colors.textMuted },
  specValue: { fontSize: 14, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.raised,
  },
  flexBtn: { flex: 1 },

  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dialogWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  dialogDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  dialogActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
