// Sở thích mua sắm. Gộp hai nhóm endpoint của backend vào một màn hình
// như bản web: PUT /users/me/profile (nghề nghiệp, độ tuổi, sở thích) và
// PUT /users/me/preferences (danh mục, thương hiệu, ngân sách).
//
// Dữ liệu này là đầu vào cho trợ lý AI — Gemini đọc để tư vấn sát người dùng hơn.
// Riêng `last_intent_summary` do AI tự ghi, chỉ đọc: UpdatePreferencesDto của backend
// cố ý không nhận trường này.
//
// Form chỉ được dựng SAU KHI có dữ liệu từ máy chủ: các ô nhập lấy giá trị ban đầu
// đúng một lần lúc gắn vào cây, dựng sớm thì sau đó không tự điền lại nữa.
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import LoadState from '../../components/LoadState';
import TextField from '../../components/TextField';
import { useAccount } from '../../context/AccountContext';
import { categoryApi } from '../../api/categories';
import { productApi } from '../../api/products';
import { getErrorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { colors, radius, spacing } from '../../theme';
import { formatVND } from '../../utils/format';
import type { ShoppingProfile, UserPreferences } from '../../types';

const AGE_RANGES = ['<18', '18-24', '25-34', '35-44', '45-54', '55+'];
const MAX_OCCUPATION = 100; // @MaxLength(100) trong profile.dto.ts

export default function PreferencesScreen() {
  const { shoppingProfile, preferences, profileLoading, profileError, reloadProfile } = useAccount();

  // Hồ sơ/sở thích tải lười — chỉ màn này dùng nên AccountProvider không tải sẵn
  // lúc mở app, mở màn này mới gọi.
  useEffect(() => {
    reloadProfile();
  }, [reloadProfile]);

  if (!shoppingProfile || !preferences) {
    return (
      <Screen edges={[]}>
        {/* Chưa có lỗi mà cũng chưa có dữ liệu nghĩa là lượt tải chưa xong — coi là
            đang tải, kể cả khung hình đầu trước khi effect phía trên kịp chạy. */}
        <LoadState loading={profileLoading || !profileError} error={profileError} onRetry={reloadProfile} />
      </Screen>
    );
  }

  return <PreferencesForm profile={shoppingProfile} preferences={preferences} />;
}

function PreferencesForm({
  profile: shoppingProfile,
  preferences,
}: {
  profile: ShoppingProfile;
  preferences: UserPreferences;
}) {
  const { updateShoppingProfile, updatePreferences } = useAccount();

  // Danh mục và thương hiệu lưu theo TÊN (không phải id) — khớp cách bản web gửi lên.
  // Lấy từ chính catalog thật để người dùng không chọn được thứ không còn bán.
  const options = useApi(
    () => Promise.all([categoryApi.list(), productApi.brands()]),
    [],
  );

  const [occupation, setOccupation] = useState(shoppingProfile.occupation ?? '');
  const [ageRange, setAgeRange] = useState<string | null>(shoppingProfile.age_range);
  const [interests, setInterests] = useState<string[]>(shoppingProfile.interests);
  const [interestDraft, setInterestDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<string[]>(preferences.preferred_categories);
  const [brands, setBrands] = useState<string[]>(preferences.preferred_brands);
  const [budgetMin, setBudgetMin] = useState(
    preferences.budget_range ? String(preferences.budget_range.min) : '',
  );
  const [budgetMax, setBudgetMax] = useState(
    preferences.budget_range ? String(preferences.budget_range.max) : '',
  );

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const addInterest = () => {
    const value = interestDraft.trim();
    if (!value || interests.includes(value)) return setInterestDraft('');
    setInterests((prev) => [...prev, value]);
    setInterestDraft('');
  };

  const save = async () => {
    const hasMin = budgetMin.trim() !== '';
    const hasMax = budgetMax.trim() !== '';
    if (hasMin !== hasMax) {
      Alert.alert('Chưa lưu được', 'Vui lòng nhập đủ cả ngân sách tối thiểu và tối đa.');
      return;
    }
    const min = Number(budgetMin);
    const max = Number(budgetMax);
    if (hasMin && hasMax) {
      if (Number.isNaN(min) || Number.isNaN(max)) {
        Alert.alert('Chưa lưu được', 'Ngân sách chỉ nhận chữ số.');
        return;
      }
      if (min > max) {
        Alert.alert('Chưa lưu được', 'Ngân sách tối thiểu phải nhỏ hơn hoặc bằng tối đa.');
        return;
      }
    }

    setSaving(true);
    try {
      // Hai endpoint riêng, gọi lần lượt: lỗi ở cái sau thì cái trước đã lưu rồi —
      // báo lỗi để người dùng bấm lưu lại, không mất dữ liệu đang nhập.
      await updateShoppingProfile({
        occupation: occupation.trim() || null,
        age_range: ageRange,
        interests,
      });
      await updatePreferences({
        preferred_categories: categories,
        preferred_brands: brands,
        budget_range: hasMin && hasMax ? { min, max } : null,
      });
      Alert.alert('Đã lưu', 'Trợ lý AI sẽ dựa vào các mục này để gợi ý sát hơn.');
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
          <View style={styles.banner}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text style={styles.bannerText}>
              Những thông tin này giúp trợ lý AI gợi ý sản phẩm hợp với bạn hơn.
            </Text>
          </View>

          {/* ---- Hồ sơ mua sắm ---- */}
          <Card title="Về bạn">
            <View style={styles.section}>
              <TextField
                label="Nghề nghiệp"
                icon="briefcase-outline"
                value={occupation}
                onChangeText={setOccupation}
                placeholder="VD: Lập trình viên, Sinh viên…"
                maxLength={MAX_OCCUPATION}
              />

              <View style={styles.field}>
                <Text style={styles.label}>Độ tuổi</Text>
                <View style={styles.chipWrap}>
                  {AGE_RANGES.map((r) => (
                    <Chip
                      key={r}
                      label={r}
                      selected={ageRange === r}
                      onPress={() => setAgeRange((prev) => (prev === r ? null : r))}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Sở thích</Text>
                <View style={styles.addRow}>
                  <View style={styles.flex}>
                    <TextField
                      value={interestDraft}
                      onChangeText={setInterestDraft}
                      placeholder="VD: gaming, nhiếp ảnh…"
                      onSubmitEditing={addInterest}
                      returnKeyType="done"
                    />
                  </View>
                  <AppButton title="Thêm" variant="outline" onPress={addInterest} />
                </View>
                {interests.length > 0 ? (
                  <View style={styles.chipWrap}>
                    {interests.map((it) => (
                      <Chip
                        key={it}
                        label={it}
                        selected
                        removable
                        onPress={() => setInterests((prev) => prev.filter((v) => v !== it))}
                      />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.hint}>Chưa có sở thích nào.</Text>
                )}
              </View>
            </View>
          </Card>

          {/* ---- Tuỳ chọn mua sắm ---- */}
          <Card title="Bạn thường mua gì">
            <View style={styles.section}>
              <View style={styles.field}>
                <Text style={styles.label}>Danh mục quan tâm</Text>
                <View style={styles.chipWrap}>
                  {(options.data?.[0] ?? []).map((c) => (
                    <Chip
                      key={c.id}
                      label={c.name}
                      selected={categories.includes(c.name)}
                      onPress={() => setCategories((prev) => toggle(prev, c.name))}
                    />
                  ))}
                </View>
                {options.data ? null : <Text style={styles.hint}>Đang tải danh mục…</Text>}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Thương hiệu yêu thích</Text>
                <View style={styles.chipWrap}>
                  {(options.data?.[1] ?? []).map((b) => (
                    <Chip
                      key={b}
                      label={b}
                      selected={brands.includes(b)}
                      onPress={() => setBrands((prev) => toggle(prev, b))}
                    />
                  ))}
                </View>
                {options.data ? null : <Text style={styles.hint}>Đang tải thương hiệu…</Text>}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Khoảng ngân sách</Text>
                <View style={styles.budgetRow}>
                  <View style={styles.flex}>
                    <TextField
                      value={budgetMin}
                      onChangeText={(t) => setBudgetMin(t.replace(/\D/g, ''))}
                      placeholder="Tối thiểu"
                      keyboardType="number-pad"
                    />
                  </View>
                  <Text style={styles.dash}>—</Text>
                  <View style={styles.flex}>
                    <TextField
                      value={budgetMax}
                      onChangeText={(t) => setBudgetMax(t.replace(/\D/g, ''))}
                      placeholder="Tối đa"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                {budgetMin || budgetMax ? (
                  <Text style={styles.hint}>
                    {formatVND(Number(budgetMin || 0))} — {formatVND(Number(budgetMax || 0))}
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>

          {preferences.last_intent_summary ? (
            <Card title="Nhu cầu gần đây (trợ lý AI ghi nhận)">
              <Text style={styles.summary}>{preferences.last_intent_summary}</Text>
            </Card>
          ) : null}

          <AppButton title="Lưu sở thích" icon="save-outline" block loading={saving} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Chip({
  label,
  selected,
  removable,
  onPress,
}: {
  label: string;
  selected?: boolean;
  removable?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
      {removable ? <Ionicons name="close" size={13} color={colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.lg },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  bannerText: { flex: 1, fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 },

  section: { gap: spacing.lg },
  field: { gap: spacing.sm },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  hint: { fontSize: 12, color: colors.textMuted },

  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dash: { fontSize: 14, color: colors.textMuted },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextOn: { color: colors.primary },

  summary: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20 },
});
