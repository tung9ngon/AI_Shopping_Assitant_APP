// UC-AUTH-02 — Đăng nhập bằng email và mật khẩu.
// UC-AUTH-03 — Đăng nhập bằng Google hoặc Facebook.
//
// Chưa gọi backend: BE hiện chỉ đặt JWT vào cookie httpOnly (jwt.strategy.ts), app không
// có trình duyệt nên phải mở rộng BE nhận header Authorization trước — mục 3.4 tài liệu.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import TextField from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState('');

  const submit = () => {
    if (!email.includes('@')) {
      setError('Email chưa đúng định dạng');
      return;
    }
    setError('');
    signIn();
    navigation.goBack();
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={styles.back}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <Ionicons name="flash" size={20} color={colors.textInverse} />
            </View>
            <Text style={styles.brand}>NexTech</Text>
          </View>

          <Text style={styles.title}>Đăng nhập</Text>
          <Text style={styles.subtitle}>Mua hàng, theo dõi đơn và giữ lại các phiên tư vấn AI.</Text>

          <View style={styles.form}>
            <TextField
              label="Email"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="ban@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={error}
            />
            <TextField
              label="Mật khẩu"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={secure}
              autoCapitalize="none"
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setSecure((s) => !s)}
              hitSlop={6}
              style={styles.toggleRow}
            >
              <Ionicons
                name={secure ? 'eye-outline' : 'eye-off-outline'}
                size={15}
                color={colors.textMuted}
              />
              <Text style={styles.toggleText}>{secure ? 'Hiện mật khẩu' : 'Ẩn mật khẩu'}</Text>
              <View style={styles.flex} />
              <Text style={styles.forgot}>Quên mật khẩu?</Text>
            </Pressable>

            <AppButton title="Đăng nhập" block onPress={submit} style={styles.submit} />
          </View>

          {/* ---- UC-AUTH-03: gõ mật khẩu trên bàn phím điện thoại là điểm rơi rớt lớn ---- */}
          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>hoặc tiếp tục với</Text>
            <View style={styles.line} />
          </View>

          <View style={styles.socialRow}>
            <SocialButton icon="logo-google" label="Google" onPress={signIn} />
            <SocialButton icon="logo-facebook" label="Facebook" onPress={signIn} />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Chưa có tài khoản?</Text>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Register')} hitSlop={6}>
              <Text style={styles.footerLink}>Đăng ký ngay</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function SocialButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Đăng nhập với ${label}`}
      onPress={onPress}
      style={({ pressed }) => [styles.social, pressed && styles.socialPressed]}
    >
      <Ionicons name={icon} size={19} color={colors.text} />
      <Text style={styles.socialText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.xl, paddingTop: spacing.lg },
  back: { alignSelf: 'flex-start', padding: 4, marginBottom: spacing.xl },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxl },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { fontSize: 21, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },

  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 20 },

  form: { gap: spacing.lg, marginTop: spacing.xxl },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  toggleText: { fontSize: 12.5, color: colors.textMuted },
  forgot: { fontSize: 12.5, fontWeight: '600', color: colors.primary },
  submit: { marginTop: spacing.sm },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xxl },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textMuted },

  socialRow: { flexDirection: 'row', gap: spacing.md },
  social: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  socialPressed: { opacity: 0.7 },
  socialText: { fontSize: 14, fontWeight: '600', color: colors.text },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxl,
  },
  footerText: { fontSize: 13.5, color: colors.textMuted },
  footerLink: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
});
