// Trạng thái đang tải / lỗi mạng cho các màn hình lấy dữ liệu từ API.
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import EmptyState from './EmptyState';
import { colors, spacing } from '../theme';

export default function LoadState({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Không tải được dữ liệu"
      description={error ?? undefined}
      actionTitle="Thử lại"
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
});
