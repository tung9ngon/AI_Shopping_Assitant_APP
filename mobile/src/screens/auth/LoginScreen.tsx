// UC-AUTH-02 — Đăng nhập bằng email và mật khẩu (POST /api/auth/login).
// UC-AUTH-03 — Đăng nhập bằng Google hoặc Facebook.
//
// Đăng nhập bằng email: backend đặt cookie phiên, app gọi tiếp GET /users/me.
//
// Google/Facebook: mở trình duyệt hệ thống (Google chặn đăng nhập trong WebView) tới
// GET /auth/<provider>?platform=mobile. Xác thực xong backend redirect về deep link
// nextech://oauth?code=... — app bắt link đó, đổi mã lấy cookie phiên qua
// POST /auth/oauth/exchange (signInWithOAuthCode). Cookie đến từ response POST trực
// tiếp nên không dính lỗi cookie-qua-302 của React Native (xem src/api/client.ts).
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import TextField from '../../components/TextField';
import Gradient from '../../components/Gradient';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, getErrorMessage } from '../../api/client';
import { colors, gradient, radius, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { signIn, signInWithOAuthCode } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.includes('@')) {
      setError('Email chưa đúng định dạng');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigation.goBack();
    } catch (err) {
      // Backend trả 401 "Sai email hoặc mật khẩu" — hiện nguyên văn.
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Trình duyệt quay về app bằng nextech://oauth?code=... — đổi mã lấy phiên.
  // App chỉ chuyển sang nền trong lúc đăng nhập nên màn hình này vẫn còn mounted
  // khi deep link bắn về; dùng chung spinner `submitting` với nút đăng nhập email.
  useEffect(() => {
    const sub = Linking.addEventListener('url', async ({ url }) => {
      const code = /^nextech:\/\/oauth\?.*\bcode=([^&#]+)/.exec(url)?.[1];
      if (!code) return;
      setError('');
      setSubmitting(true);
      try {
        await signInWithOAuthCode(code);
        navigation.goBack();
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    });
    return () => sub.remove();
  }, [signInWithOAuthCode, navigation]);

  const openOAuth = (provider: 'google' | 'facebook') => {
    setError('');
    Linking.openURL(`${API_BASE_URL}/auth/${provider}?platform=mobile`).catch(() =>
      Alert.alert('Lỗi', 'Không mở được trình duyệt để đăng nhập.'),
    );
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
            <Gradient colors={gradient.brand} style={styles.logoMark}>
              <Ionicons name="flash" size={20} color={colors.textInverse} />
            </Gradient>
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
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('ForgotPassword')}
              hitSlop={6}
              style={styles.forgotRow}
            >
              <Text style={styles.forgot}>Quên mật khẩu?</Text>
            </Pressable>

            {/* Lỗi hiện chung dưới form: "sai mật khẩu" hay "thiếu mật khẩu" mà gắn
                vào riêng ô Email là báo sai chỗ. */}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <AppButton
              title="Đăng nhập"
              block
              loading={submitting}
              onPress={submit}
              style={styles.submit}
            />
          </View>

          {/* ---- UC-AUTH-03: gõ mật khẩu trên bàn phím điện thoại là điểm rơi rớt lớn ---- */}
          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>hoặc tiếp tục với</Text>
            <View style={styles.line} />
          </View>

          <View style={styles.socialRow}>
            <SocialButton icon="logo-google" label="Google" onPress={() => openOAuth('google')} />
            <SocialButton
              icon="logo-facebook"
              label="Facebook"
              onPress={() => openOAuth('facebook')}
            />
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
  icon: IoniconsIconName;
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
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { fontSize: 21, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },

  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 20 },

  form: { gap: spacing.lg, marginTop: spacing.xxl },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  toggleText: { fontSize: 12.5, color: colors.textMuted },
  forgotRow: { alignSelf: 'flex-end' },
  forgot: { fontSize: 12.5, fontWeight: '600', color: colors.primary },
  error: { fontSize: 12.5, color: colors.danger },
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
    height: 50,
    borderRadius: radius.lg,
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
