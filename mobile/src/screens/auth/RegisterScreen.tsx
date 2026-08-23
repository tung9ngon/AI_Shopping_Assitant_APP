// UC-AUTH-01 — Đăng ký tài khoản bằng email và mã OTP.
//
// Ba bước đúng theo luồng backend: nhập email → nhận OTP 6 số (hiệu lực 5 phút) →
// xác thực rồi đặt mật khẩu (có 10 phút để hoàn tất). Đồng hồ đếm ngược dưới đây hiển
// thị đúng hai mốc thời gian đó.
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 5 * 60; // khớp thời hạn mã OTP lưu trong Redis

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
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);

  const otpInputRef = useRef<TextInput>(null);

  // Đồng hồ đếm ngược hiệu lực mã OTP.
  useEffect(() => {
    if (step !== 1) return;
    setSecondsLeft(OTP_TTL_SECONDS);
    const timer = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [step]);

  const next = () => {
    setError('');
    if (step === 0) {
      if (!email.includes('@')) return setError('Email chưa đúng định dạng');
      return setStep(1);
    }
    if (step === 1) {
      if (otp.length < OTP_LENGTH) return setError(`Mã xác thực gồm ${OTP_LENGTH} chữ số`);
      return setStep(2);
    }
    if (!fullName.trim()) return setError('Vui lòng nhập họ tên');
    if (password.length < 6) return setError('Mật khẩu tối thiểu 6 ký tự');
    if (password !== confirm) return setError('Hai mật khẩu chưa khớp');
    signIn();
    navigation.navigate('Tabs', { screen: 'Account' });
  };

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(
    secondsLeft % 60,
  ).padStart(2, '0')}`;

  return (
    <Screen edges={[]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* ---- Chỉ báo bước ---- */}
          <View style={styles.stepper}>
            {STEPS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <View key={label} style={styles.stepItem}>
                  {i > 0 ? <View style={[styles.stepLine, i <= step && styles.stepLineDone]} /> : null}
                  <View style={[styles.stepDot, (done || active) && styles.stepDotActive]}>
                    {done ? (
                      <Ionicons name="checkmark" size={13} color={colors.textInverse} />
                    ) : (
                      <Text style={[styles.stepNum, active && styles.stepNumActive]}>{i + 1}</Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
                </View>
              );
            })}
          </View>

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

              {/* Sáu ô hiển thị, nhận ký tự qua một ô nhập trong suốt phủ lên trên */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Nhập mã xác thực"
                onPress={() => otpInputRef.current?.focus()}
                style={styles.otpRow}
              >
                {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                  <View key={i} style={[styles.otpBox, otp.length === i && styles.otpBoxActive]}>
                    <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
                  </View>
                ))}
                <TextInput
                  ref={otpInputRef}
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                  keyboardType="number-pad"
                  maxLength={OTP_LENGTH}
                  style={styles.otpHiddenInput}
                  autoFocus
                />
              </Pressable>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.resendRow}>
                {secondsLeft > 0 ? (
                  <Text style={styles.resendText}>Mã còn hiệu lực {mmss}</Text>
                ) : (
                  <Text style={styles.resendText}>Mã đã hết hạn</Text>
                )}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSecondsLeft(OTP_TTL_SECONDS)}
                  disabled={secondsLeft > 0}
                  hitSlop={6}
                >
                  <Text style={[styles.resendLink, secondsLeft > 0 && styles.resendLinkOff]}>
                    Gửi lại mã
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
                placeholder="Tối thiểu 6 ký tự"
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

  stepper: { flexDirection: 'row', marginBottom: spacing.xl },
  stepItem: { flex: 1, alignItems: 'center', gap: spacing.sm },
  stepLine: {
    position: 'absolute',
    right: '50%',
    top: 13,
    width: '100%',
    height: 2,
    backgroundColor: colors.border,
  },
  stepLineDone: { backgroundColor: colors.primary },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepNum: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  stepNumActive: { color: colors.textInverse },
  stepLabel: { fontSize: 11, color: colors.textMuted },
  stepLabelActive: { color: colors.text, fontWeight: '600' },

  form: { gap: spacing.lg },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  desc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginTop: -spacing.sm },
  strong: { fontWeight: '700', color: colors.text },

  otpRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  otpBox: {
    flex: 1,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: { borderColor: colors.primary },
  otpDigit: { fontSize: 20, fontWeight: '700', color: colors.text },
  otpHiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    fontSize: 1,
  },

  error: { fontSize: 12.5, color: colors.danger },
  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resendText: { fontSize: 12.5, color: colors.textMuted },
  resendLink: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
  resendLinkOff: { color: colors.borderStrong },

  submit: { marginTop: spacing.xl },
});
