import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import { colors, spacing } from '../theme';

export default function EmptyState({
  icon = 'file-tray-outline',
  title,
  description,
  actionTitle,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={34} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {actionTitle && onAction ? (
        <AppButton title={actionTitle} onPress={onAction} style={{ marginTop: spacing.lg }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xxl * 2, paddingHorizontal: spacing.xl },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center' },
  desc: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
