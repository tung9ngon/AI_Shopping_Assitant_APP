// Thêm / sửa địa chỉ giao hàng. Không có tham số addressId = thêm mới.
//
// Ô địa chỉ gợi ý theo Goong Maps (GET /api/places/autocomplete, backend giữ khoá).
// Chọn một gợi ý là điền nguyên chuỗi địa chỉ đó vào ô — vẫn cho sửa lại và vẫn cho gõ
// tay hoàn toàn, vì gợi ý có thể thiếu số nhà/số phòng.
//
// Ràng buộc lấy đúng theo backend (users/address/address.dto.ts) để app không chặn
// dữ liệu BE chấp nhận và ngược lại: địa chỉ tối đa 255 ký tự, tên người nhận tối đa
// 150, số điện thoại khớp /^[0-9+ ]{8,15}$/.
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import TextField from '../../components/TextField';
import { useAccount } from '../../context/AccountContext';
import { placeApi, type PlaceSuggestion } from '../../api/places';
import { getErrorMessage } from '../../api/client';
import { colors, radius, spacing } from '../../theme';
import { PHONE_MESSAGE, PHONE_PATTERN } from '../../constants';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'AddressForm'>;

const MAX_ADDRESS = 255;
const MAX_NAME = 150;

// Gõ tới đâu gọi tới đó thì mỗi ký tự là một lượt tính tiền của Google — đợi ngừng gõ.
const SUGGEST_DEBOUNCE_MS = 400;
const MIN_SUGGEST_CHARS = 2;

export default function AddressFormScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { addresses, addAddress, updateAddress } = useAccount();

  const editing = params?.addressId ? addresses.find((a) => a.id === params.addressId) ?? null : null;

  const [recipientName, setRecipientName] = useState(editing?.recipient_name ?? '');
  const [phone, setPhone] = useState(editing?.phone_number ?? '');
  const [fullAddress, setFullAddress] = useState(editing?.full_address ?? '');
  const [isDefault, setIsDefault] = useState(editing?.is_default ?? false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; address?: string }>({});
  const [saving, setSaving] = useState(false);

  // Địa chỉ đang là mặc định thì không cho bỏ cờ ngay tại đây — bỏ xong tài khoản
  // không còn địa chỉ mặc định nào. Muốn đổi thì đặt mặc định cho địa chỉ khác.
  const lockDefault = editing?.is_default === true;

  // ---- Gợi ý địa chỉ ----
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  // Lời nhắn khi chưa gợi ý được (chưa khai khoá API, mất mạng…). Không phải lỗi của
  // người dùng nên để dạng ghi chú, không chặn nút Lưu.
  const [suggestNote, setSuggestNote] = useState<string | null>(null);
  // Bỏ qua một lượt gợi ý: lúc mở màn sửa (ô đã có sẵn chữ) và ngay sau khi người dùng
  // chọn một gợi ý — cả hai đều không phải là "đang gõ để tìm".
  const skipSuggest = useRef(true);

  useEffect(() => {
    if (skipSuggest.current) {
      skipSuggest.current = false;
      setSuggestions([]);
      return;
    }
    const term = fullAddress.trim();
    if (term.length < MIN_SUGGEST_CHARS) {
      setSuggestions([]);
      setSuggestNote(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await placeApi.autocomplete(term, controller.signal);
        setSuggestions(res.items);
        setSuggestNote(res.items.length === 0 ? 'Không tìm thấy địa chỉ phù hợp' : null);
      } catch (err) {
        // Lượt bị huỷ vì người dùng gõ tiếp — không phải lỗi, đừng báo.
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setSuggestNote(getErrorMessage(err));
      } finally {
        if (!controller.signal.aborted) setSuggesting(false);
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fullAddress]);

  const pickSuggestion = (item: PlaceSuggestion) => {
    skipSuggest.current = true;
    setFullAddress(item.description.slice(0, MAX_ADDRESS));
    setSuggestions([]);
    setSuggestNote(null);
    setErrors((prev) => ({ ...prev, address: undefined }));
  };

  const submit = async () => {
    const next: typeof errors = {};
    if (!recipientName.trim()) next.name = 'Vui lòng nhập họ tên người nhận';
    else if (recipientName.trim().length > MAX_NAME) next.name = `Tối đa ${MAX_NAME} ký tự`;

    if (!phone.trim()) next.phone = 'Vui lòng nhập số điện thoại';
    else if (!PHONE_PATTERN.test(phone.trim()))
      next.phone = PHONE_MESSAGE;

    if (!fullAddress.trim()) next.address = 'Vui lòng nhập địa chỉ';
    else if (fullAddress.trim().length > MAX_ADDRESS) next.address = `Địa chỉ tối đa ${MAX_ADDRESS} ký tự`;

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload = {
      recipient_name: recipientName.trim(),
      phone_number: phone.trim(),
      full_address: fullAddress.trim(),
      is_default: isDefault,
    };

    // Địa chỉ vẫn phải qua kiểm tra của backend (address.dto.ts) — validate ở đây chỉ
    // để báo sớm, lỗi từ máy chủ mới là lời cuối.
    setSaving(true);
    try {
      if (editing) await updateAddress(editing.id, payload);
      else await addAddress(payload);
      navigation.goBack();
    } catch (err) {
      Alert.alert(editing ? 'Không lưu được địa chỉ' : 'Không thêm được địa chỉ', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={[]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <TextField
            label="Họ và tên người nhận"
            icon="person-outline"
            value={recipientName}
            onChangeText={setRecipientName}
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

          <TextField
            label="Địa chỉ"
            icon="location-outline"
            value={fullAddress}
            onChangeText={setFullAddress}
            placeholder="Gõ để tìm địa chỉ trên bản đồ"
            multiline
            maxLength={MAX_ADDRESS}
            style={styles.addressInput}
            error={errors.address}
          />

          {suggesting ? (
            <View style={styles.suggestNoteRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.suggestNote}>Đang tìm địa chỉ…</Text>
            </View>
          ) : suggestNote ? (
            <View style={styles.suggestNoteRow}>
              <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
              <Text style={styles.suggestNote}>{suggestNote}</Text>
            </View>
          ) : null}

          {suggestions.length > 0 ? (
            <View style={styles.suggestBox}>
              {suggestions.map((item, i) => (
                <Pressable
                  key={item.place_id}
                  accessibilityRole="button"
                  onPress={() => pickSuggestion(item)}
                  style={({ pressed }) => [
                    styles.suggestRow,
                    i > 0 && styles.suggestRowBorder,
                    pressed && styles.suggestRowPressed,
                  ]}
                >
                  <Ionicons name="location-outline" size={17} color={colors.primary} />
                  <View style={styles.flex}>
                    <Text style={styles.suggestMain} numberOfLines={1}>
                      {item.main_text ?? item.description}
                    </Text>
                    {item.secondary_text ? (
                      <Text style={styles.suggestSecondary} numberOfLines={2}>
                        {item.secondary_text}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text style={styles.counter}>
            {fullAddress.length}/{MAX_ADDRESS} ký tự
          </Text>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isDefault, disabled: lockDefault }}
            onPress={lockDefault ? undefined : () => setIsDefault((v) => !v)}
            disabled={lockDefault}
            style={styles.checkRow}
          >
            <View style={[styles.checkbox, isDefault && styles.checkboxOn]}>
              {isDefault ? <Ionicons name="checkmark" size={14} color={colors.textInverse} /> : null}
            </View>
            <View style={styles.flex}>
              <Text style={[styles.checkLabel, lockDefault && styles.checkLabelOff]}>
                Đặt làm địa chỉ mặc định
              </Text>
              {lockDefault ? (
                <Text style={styles.checkHint}>
                  Đây đang là địa chỉ mặc định. Muốn đổi, hãy đặt mặc định cho địa chỉ khác.
                </Text>
              ) : null}
            </View>
          </Pressable>

          <AppButton
            title={editing ? 'Lưu thay đổi' : 'Thêm địa chỉ'}
            block
            loading={saving}
            onPress={submit}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.lg },

  addressInput: { minHeight: 62, textAlignVertical: 'top', paddingTop: spacing.sm },
  counter: { fontSize: 11.5, color: colors.textMuted, textAlign: 'right', marginTop: -spacing.md },

  suggestNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -spacing.md },
  suggestNote: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  suggestBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginTop: -spacing.sm,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  suggestRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  suggestRowPressed: { backgroundColor: colors.surfaceAlt },
  suggestMain: { fontSize: 14, color: colors.text, fontWeight: '600' },
  suggestSecondary: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginTop: 1 },

  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  checkLabelOff: { color: colors.textSecondary },
  checkHint: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginTop: 3 },

  submit: { marginTop: spacing.sm },
});
