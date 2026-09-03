import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

export default function Card({
  title,
  children,
  style,
  padded = true,
}: {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}) {
  return (
    <View style={[styles.card, padded && styles.padded, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    // Không viền: thẻ luôn nằm trên nền xám, chỉ riêng đổ bóng đã đủ tách khỏi nền,
    // thêm viền thành hai đường ranh giới chồng nhau.
    ...shadow.card,
  },
  padded: { padding: spacing.lg },
  title: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.md, letterSpacing: -0.2 },
});
