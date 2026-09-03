// Xem và sửa hồ sơ cá nhân (GET/PUT /api/users/me).
//
// Email đăng nhập không sửa được: UpdateMeDto của backend chỉ nhận full_name,
// phone_number, avatar_url.
//
// Bản web cho tải ảnh đại diện lên (nén rồi lưu base64 vào cột avatar_url). Ở đây
// chưa làm — chọn ảnh từ máy cần thêm react-native-image-picker, để vòng sau cùng nhóm
// tính năng camera (UC-MOB-04).
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import TextField from '../../components/TextField';
import Tag from '../../components/Tag';
import Gradient from '../../components/Gradient';
import { useAuth } from '../../context/AuthContext';
import { profileApi } from '../../api/profile';
import { getErrorMessage } from '../../api/client';
import { colors, gradient, spacing } from '../../theme';
import { PHONE_MESSAGE, PHONE_PATTERN } from '../../constants';
import { avatarInitial, formatDateShort } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MAX_NAME = 150;

// Tên người Việt xếp họ trước, tên gọi sau — chữ đại diện lấy chữ đầu của từ cuối.
export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, updateUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone_number ?? '');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <Screen edges={[]}>
        <View style={styles.center}>
          <Text style={styles.guest}>Bạn cần đăng nhập để xem hồ sơ.</Text>
          <AppButton title="Đăng nhập" onPress={() => navigation.navigate('Login')} />
        </View>
      </Screen>
    );
  }

  const save = async () => {
    const next: typeof errors = {};
    if (!fullName.trim()) next.name = 'Vui lòng nhập họ tên';
    else if (fullName.trim().length > MAX_NAME) next.name = `Tối đa ${MAX_NAME} ký tự`;

    // Số điện thoại không bắt buộc, nhưng đã nhập thì phải đúng dạng BE chấp nhận.
    if (phone.trim() && !PHONE_PATTERN.test(phone.trim()))
      next.phone = PHONE_MESSAGE;

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // BE từ chối phone_number là chuỗi rỗng (@Matches), còn null thì được và
    // hiểu là xoá số — nên bỏ trống gửi null thay vì ''.
    const payload = { full_name: fullName.trim(), phone_number: phone.trim() || null };
    setSaving(true);
    try {
      await profileApi.updateMe(payload);
      // PUT trả bản rút gọn, không đủ cho màn Tài khoản — cập nhật tại chỗ đúng hai
      // trường vừa sửa thay vì tải lại toàn bộ hồ sơ.
      updateUser(payload);
      Alert.alert('Đã lưu', 'Thông tin tài khoản đã được cập nhật.');
    } catch (err) {
      Alert.alert('Chưa lưu được', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={[]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* ---- Thẻ tóm tắt, các trường chỉ đọc ---- */}
          <Card>
            <View style={styles.summary}>
              <Gradient colors={gradient.brand} style={styles.avatar}>
                <Text style={styles.avatarText}>{avatarInitial(user.full_name)}</Text>
              </Gradient>
              <View style={styles.flex}>
                <Text style={styles.name}>{user.full_name}</Text>
                <View style={styles.tagRow}>
                  <Tag
                    label={user.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                    color={user.role === 'admin' ? 'gold' : 'blue'}
                  />
                  <Tag
                    label={user.is_active ? 'Đang hoạt động' : 'Đã khoá'}
                    color={user.is_active ? 'green' : 'red'}
                  />
                </View>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Ngày tham gia</Text>
              <Text style={styles.metaValue}>{formatDateShort(user.created_at)}</Text>
            </View>
          </Card>

          {/* ---- Phần sửa được ---- */}
          <Card title="Chỉnh sửa thông tin">
            <View style={styles.form}>
              <View>
                <TextField
                  label="Email"
                  icon="mail-outline"
                  value={user.email ?? '—'}
                  editable={false}
                  style={styles.readonly}
                />
                <Text style={styles.hint}>Email đăng nhập không thay đổi được.</Text>
              </View>

              <TextField
                label="Họ và tên"
                icon="person-outline"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nguyễn Văn A"
                maxLength={MAX_NAME}
                error={errors.name}
              />

              <TextField
                label="Số điện thoại"
                icon="call-outline"
                value={phone}
                onChangeText={setPhone}
                placeholder="0912345678"
                keyboardType="phone-pad"
                maxLength={15}
                error={errors.phone}
              />

              <AppButton title="Lưu thay đổi" icon="save-outline" block loading={saving} onPress={save} />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  guest: { fontSize: 14, color: colors.textSecondary },

  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: colors.textInverse },
  name: { fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  tagRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaLabel: { fontSize: 13, color: colors.textMuted },
  metaValue: { fontSize: 13, fontWeight: '600', color: colors.text },

  form: { gap: spacing.lg },
  readonly: { color: colors.textMuted },
  hint: { fontSize: 11.5, color: colors.textMuted, marginTop: spacing.xs },
});
