// Quên mật khẩu — đặt lại mật khẩu qua mã OTP gửi về email.
//
// Ba bước đúng theo backend: POST /auth/forgot-password → /auth/verify-reset-otp →
// /auth/reset-password. Mã OTP hiệu lực 5 phút, chặn gửi lại trong 60 giây đầu.
//
// Bước 1 backend luôn trả thành công dù email có tồn tại hay không (cố ý, để không
// lộ tài khoản nào đang có trong hệ thống) — nên không thể báo "email không tồn tại".
//
// Quy tắc mật khẩu lấy đúng PASSWORD_REGEX của BE (auth.dto.ts): tối thiểu 8 ký tự,
// ít nhất 1 chữ hoa và 1 chữ số.
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import TextField from '../../components/TextField';
import OtpInput, { OTP_LENGTH } from '../../components/OtpInput';
import StepIndicator from '../../components/StepIndicator';
import { authApi } from '../../api/auth';
import { getErrorMessage } from '../../api/client';
import { useCooldown } from '../../hooks/useCooldown';
import { colors, spacing } from '../../theme';
import { PASSWORD_MESSAGE, PASSWORD_REGEX } from '../../constants';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const OTP_TTL_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

const STEPS = ['Email', 'Mã xác thực', 'Mật khẩu mới'];

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const [submitting, setSubmitting] = useState(false);

  // Tăng mỗi lần THỰC SỰ gửi OTP — đồng hồ hiệu lực chỉ chạy lại theo nó, không chạy
  // lại khi quay về bước 2 từ bước 3 (mã cũ vẫn là mã cũ, hạn không đổi). Cùng cách
  // làm với RegisterScreen.
  const [otpRound, setOtpRound] = useState(0);

  useEffect(() => {
    if (otpRound === 0) return;
    setSecondsLeft(OTP_TTL_SECONDS);
    const timer = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [otpRound]);

  // Chặn bấm gửi lại dồn dập — mỗi lượt gửi cách nhau tối thiểu 60 giây.
  const { cooldown, startCooldown } = useCooldown(RESEND_COOLDOWN_SECONDS);

  // Một đường gửi OTP duy nhất cho cả nút ở bước 0 lẫn liên kết "Gửi lại mã" ở bước 1
  // — khác nhau đúng một chỗ: lần đầu thì tiến sang bước nhập mã.
  const requestOtp = async (advance: boolean) => {
    setError('');
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
      setOtp('');
      if (advance) setStep(1);
      setOtpRound((r) => r + 1);
      startCooldown();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const sendOtp = () => {
    if (!email.includes('@')) return setError('Email chưa đúng định dạng');
    return requestOtp(true);
  };

  const verifyOtp = async () => {
    if (otp.length < OTP_LENGTH) return setError(`Mã xác thực gồm ${OTP_LENGTH} chữ số`);
    if (secondsLeft === 0) return setError('Mã đã hết hạn, vui lòng gửi lại');
    setError('');
    setSubmitting(true);
    try {
      await authApi.verifyResetOtp(email.trim(), otp);
      setStep(2);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async () => {
    if (!PASSWORD_REGEX.test(password)) return setError(PASSWORD_MESSAGE);
    if (password !== confirm) return setError('Hai mật khẩu chưa khớp');
    setError('');
    setSubmitting(true);
    try {
      await authApi.resetPassword(email.trim(), password);
      // Đặt lại xong backend không tự đăng nhập — quay về màn Đăng nhập như bản web.
      navigation.replace('Login');
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
              <Text style={styles.title}>Quên mật khẩu</Text>
              <Text style={styles.desc}>
                Nhập email đã đăng ký. Nếu email có trong hệ thống, mã xác thực {OTP_LENGTH} số sẽ
                được gửi tới hộp thư của bạn.
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
                  onPress={() => requestOtp(false)}
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
              <Text style={styles.title}>Đặt mật khẩu mới</Text>
              <Text style={styles.desc}>{PASSWORD_MESSAGE}.</Text>
              <TextField
                label="Mật khẩu mới"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="Mật khẩu mới"
                secureTextEntry
                autoCapitalize="none"
              />
              <TextField
                label="Nhập lại mật khẩu"
                icon="lock-closed-outline"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Nhập lại mật khẩu mới"
                secureTextEntry
                autoCapitalize="none"
                error={error}
              />
            </View>
          ) : null}

          <AppButton
            title={step === 0 ? 'Gửi mã xác thực' : step === 1 ? 'Xác thực' : 'Đặt lại mật khẩu'}
            block
            loading={submitting}
            onPress={step === 0 ? sendOtp : step === 1 ? verifyOtp : resetPassword}
            style={styles.submit}
          />

          {step > 0 ? (
            <AppButton
              title="Quay lại bước trước"
              variant="ghost"
              block
              onPress={() => {
                setError('');
                setStep(step - 1);
              }}
            />
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.replace('Login')}
            hitSlop={8}
            style={styles.backLoginRow}
          >
            <Text style={styles.backLogin}>Quay lại đăng nhập</Text>
          </Pressable>
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
  backLoginRow: { alignItems: 'center', marginTop: spacing.md },
  backLogin: { fontSize: 13, fontWeight: '600', color: colors.primary },
});
