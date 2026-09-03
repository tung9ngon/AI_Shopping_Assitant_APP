// Sổ địa chỉ giao hàng (GET/PUT/DELETE /api/users/me/addresses).
//
// Danh sách dùng chung với màn Đặt hàng qua AccountContext: thêm địa chỉ ở đây là
// chọn được ngay khi đặt hàng, không phải khởi động lại app.
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import LoadState from '../../components/LoadState';
import Tag from '../../components/Tag';
import { useAccount } from '../../context/AccountContext';
import { getErrorMessage } from '../../api/client';
import { colors, radius, shadow, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AddressBookScreen() {
  const navigation = useNavigation<Nav>();
  const {
    addresses,
    addressesLoading,
    addressesError,
    reloadAddresses,
    removeAddress,
    setDefaultAddress,
  } = useAccount();
  // Khoá thao tác trong lúc chờ máy chủ: bấm "Đặt mặc định" hai lần liên tiếp sẽ tạo
  // hai lượt gọi cùng ghi vào một danh sách.
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>, failTitle: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (err) {
      Alert.alert(failTitle, getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (id: string) => {
    Alert.alert('Xoá địa chỉ', 'Địa chỉ này sẽ bị xoá khỏi sổ địa chỉ của bạn.', [
      { text: 'Giữ lại', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => run(() => removeAddress(id), 'Không xoá được địa chỉ'),
      },
    ]);
  };

  if (addressesLoading || addressesError) {
    return (
      <Screen edges={[]}>
        <LoadState loading={addressesLoading} error={addressesError} onRetry={reloadAddresses} />
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <FlatList
        data={addresses}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="location-outline"
            title="Bạn chưa có địa chỉ nào"
            description="Thêm địa chỉ để đặt hàng nhanh hơn, không phải nhập lại mỗi lần mua."
            actionTitle="Thêm địa chỉ đầu tiên"
            onAction={() => navigation.navigate('AddressForm', {})}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.head}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={styles.name} numberOfLines={1}>
                {item.recipient_name || 'Người nhận'}
              </Text>
              {item.is_default ? <Tag label="Mặc định" color="gold" /> : null}
            </View>

            <Text style={styles.phone}>{item.phone_number || '—'}</Text>
            <Text style={styles.address}>{item.full_address}</Text>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: item.is_default || busy }}
                onPress={
                  item.is_default
                    ? undefined
                    : () => run(() => setDefaultAddress(item.id), 'Không đặt được địa chỉ mặc định')
                }
                disabled={item.is_default || busy}
                hitSlop={6}
                style={styles.action}
              >
                <Ionicons
                  name={item.is_default ? 'star' : 'star-outline'}
                  size={15}
                  color={item.is_default ? colors.warning : colors.textSecondary}
                />
                <Text style={[styles.actionText, item.is_default && styles.actionTextOff]}>
                  {item.is_default ? 'Đang mặc định' : 'Đặt mặc định'}
                </Text>
              </Pressable>

              <View style={styles.flex} />

              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('AddressForm', { addressId: item.id })}
                hitSlop={6}
                style={styles.action}
              >
                <Ionicons name="create-outline" size={15} color={colors.textSecondary} />
                <Text style={styles.actionText}>Sửa</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => confirmRemove(item.id)}
                hitSlop={6}
                style={styles.action}
              >
                <Ionicons name="trash-outline" size={15} color={colors.danger} />
                <Text style={[styles.actionText, styles.actionDanger]}>Xoá</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      {addresses.length > 0 ? (
        <View style={styles.footer}>
          <AppButton
            title="Thêm địa chỉ"
            icon="add"
            block
            onPress={() => navigation.navigate('AddressForm', {})}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    ...shadow.card,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: 14.5, fontWeight: '700', color: colors.text, flexShrink: 1 },
  phone: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  address: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionText: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },
  actionTextOff: { color: colors.textMuted },
  actionDanger: { color: colors.danger },

  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.raised,
  },
});
