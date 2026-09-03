// UC-AUTH-01 — Đăng ký tài khoản bằng email và mã OTP.
//
// Ba bước đúng theo luồng backend: POST /auth/send-otp → POST /auth/verify-otp →
// POST /auth/register. Mã OTP hiệu lực 5 phút, sau khi xác thực có 10 phút để hoàn tất.
// Đăng ký xong backend KHÔNG tự đăng nhập, nên app gọi tiếp /auth/login.
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import TextField from '../../components/TextField';
import OtpInput, { OTP_LENGTH } from '../../components/OtpInput';
import StepIndicator from '../../components/StepIndicator';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { getErrorMessage } from '../../api/client';
import { useCooldown } from '../../hooks/useCooldown';
import { colors, spacing } from '../../theme';
import { PASSWORD_MESSAGE, PASSWORD_REGEX } from '../../constants';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const OTP_TTL_SECONDS = 5 * 60; // khớp thời hạn mã OTP lưu trong Redis
const RESEND_COOLDOWN_SECONDS = 60; // cùng nhịp với màn Quên mật khẩu


const STEPS = ['Email', 'Mã xác thực', 'Mật khẩu'];

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { signIn } = useAuth();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  // Tăng mỗi lần THỰC SỰ gửi OTP — đồng hồ hiệu lực chỉ chạy lại theo nó, không chạy
  // lại khi quay về bước 2 từ bước 3 (mã cũ vẫn là mã cũ, hạn không đổi).
  const [otpRound, setOtpRound] = useState(0);

  // Đồng hồ đếm ngược hiệu lực mã OTP, chạy theo từng lượt gửi mã.
  useEffect(() => {
    if (otpRound === 0) return;
    setSecondsLeft(OTP_TTL_SECONDS);
    const timer = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [otpRound]);

  // Chặn bấm gửi lại dồn dập — không bắt người dùng chờ hết hạn mã 5 phút mới xin
  // được mã mới (email vào spam là kẹt cứng).
  const { cooldown, startCooldown } = useCooldown(RESEND_COOLDOWN_SECONDS);

  const next = async () => {
    setError('');

    if (step === 0) {
      if (!email.includes('@')) return setError('Email chưa đúng định dạng');
      setSubmitting(true);
      try {
        await authApi.sendOtp(email.trim());
        setOtpRound((r) => r + 1);
        startCooldown();
        setStep(1);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (step === 1) {
      if (otp.length < OTP_LENGTH) return setError(`Mã xác thực gồm ${OTP_LENGTH} chữ số`);
      if (secondsLeft === 0) return setError('Mã đã hết hạn, vui lòng gửi lại');
      setSubmitting(true);
      try {
        await authApi.verifyOtp(email.trim(), otp);
        setStep(2);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!fullName.trim()) return setError('Vui lòng nhập họ tên');
    if (!PASSWORD_REGEX.test(password)) return setError(PASSWORD_MESSAGE);
    if (password !== confirm) return setError('Hai mật khẩu chưa khớp');

    setSubmitting(true);
    try {
      await authApi.register({ email: email.trim(), password, full_name: fullName.trim() });
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
      return;
    }

    // Tài khoản ĐÃ tạo xong — tự đăng nhập hỏng (mạng chập chờn) không được hiện như
    // đăng ký thất bại: bấm "Tạo tài khoản" lần nữa sẽ nhận "email đã tồn tại" oan.
    try {
      await signIn(email.trim(), password);
      navigation.navigate('Tabs', { screen: 'Account' });
    } catch {
      Alert.alert(
        'Tài khoản đã được tạo',
        'Chưa tự đăng nhập được, vui lòng đăng nhập bằng email và mật khẩu vừa đặt.',
      );
      navigation.replace('Login');
    } finally {
      setSubmitting(false);
    }
  };

  // Gửi lại mã: gọi lại đúng endpoint gửi OTP, đồng hồ hiệu lực chạy lại từ đầu.
  const resendOtp = async () => {
    setError('');
    setSubmitting(true);
    try {
      await authApi.sendOtp(email.trim());
      setOtp('');
      setOtpRound((r) => r + 1);
      startCooldown();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(
    secondsLeft % 60,
  ).padStart(2, '0')}`;

  return (
    <Screen edges={[]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <StepIndicator steps={STEPS} current={step} />

          {step === 0 ? (
            <View style={styles.form}>
              <Text style={styles.title}>Tạo tài khoản</Text>
              <Text style={styles.desc}>
                Nhập email của bạn. Chúng tôi gửi mã xác thực {OTP_LENGTH} số để chắc chắn email là
                của bạn.
              </Text>
              <TextField
                label="Email"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="ban@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={error}
              />
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.form}>
              <Text style={styles.title}>Nhập mã xác thực</Text>
              <Text style={styles.desc}>
                Mã gồm {OTP_LENGTH} chữ số vừa được gửi tới <Text style={styles.strong}>{email}</Text>.
              </Text>

              <OtpInput value={otp} onChange={setOtp} autoFocus />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.resendRow}>
                {secondsLeft > 0 ? (
                  <Text style={styles.resendText}>Mã còn hiệu lực {mmss}</Text>
                ) : (
                  <Text style={styles.resendText}>Mã đã hết hạn</Text>
                )}
                <Pressable
                  accessibilityRole="button"
                  onPress={resendOtp}
                  disabled={cooldown > 0 || submitting}
                  hitSlop={6}
                >
                  <Text style={[styles.resendLink, cooldown > 0 && styles.resendLinkOff]}>
                    {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.form}>
              <Text style={styles.title}>Hoàn tất đăng ký</Text>
              <Text style={styles.desc}>Đặt họ tên và mật khẩu để bắt đầu mua hàng.</Text>
              <TextField
                label="Họ và tên"
                icon="person-outline"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nguyễn Văn A"
              />
              <TextField
                label="Mật khẩu"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="Tối thiểu 8 ký tự, có chữ hoa và số"
                secureTextEntry
                autoCapitalize="none"
              />
              <TextField
                label="Nhập lại mật khẩu"
                icon="lock-closed-outline"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Nhập lại mật khẩu"
                secureTextEntry
                autoCapitalize="none"
                error={error}
              />
            </View>
          ) : null}

          <AppButton
            title={step === 2 ? 'Tạo tài khoản' : 'Tiếp tục'}
            block
            loading={submitting}
            onPress={next}
            style={styles.submit}
          />

          {step > 0 ? (
            <AppButton title="Quay lại bước trước" variant="ghost" block onPress={() => setStep(step - 1)} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.xl, gap: spacing.md },


  form: { gap: spacing.lg },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  desc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginTop: -spacing.sm },
  strong: { fontWeight: '700', color: colors.text },


  error: { fontSize: 12.5, color: colors.danger },
  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resendText: { fontSize: 12.5, color: colors.textMuted },
  resendLink: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
  resendLinkOff: { color: colors.borderStrong },

  submit: { marginTop: spacing.xl },
});
