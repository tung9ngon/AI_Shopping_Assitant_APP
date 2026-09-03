import { StyleSheet, Text, View } from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';
import AppButton from './AppButton';
import Gradient from './Gradient';
import { colors, gradient, spacing } from '../theme';

export default function EmptyState({
  icon = 'file-tray-outline',
  title,
  description,
  actionTitle,
  onAction,
}: {
  icon?: IoniconsIconName;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Gradient colors={gradient.brandSoft} style={styles.iconBox}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </Gradient>
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
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  desc: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
