import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';

import { colors, radius, spacing } from '../../theme';
import { MAX_MESSAGE_LENGTH } from './chatMessage';

export default function ChatComposer({
  draft,
  onChangeDraft,
  onSend,
  busy,
}: {
  draft: string;
  onChangeDraft: (text: string) => void;
  onSend: () => void;
  busy: boolean;
}) {
  const canSend = draft.trim().length > 0 && !busy;
  const remaining = MAX_MESSAGE_LENGTH - draft.length;

  return (
    <>
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={(t) => onChangeDraft(t.slice(0, MAX_MESSAGE_LENGTH))}
          placeholder="Bạn đang cần tìm gì?"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          accessibilityLabel="Ô nhập câu hỏi cho trợ lý AI"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gửi"
          accessibilityState={{ disabled: !canSend }}
          onPress={onSend}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.sendBtn,
            !canSend && styles.sendBtnOff,
            pressed && canSend && styles.sendBtnPressed,
          ]}
        >
          <Ionicons name="arrow-up" size={20} color={canSend ? colors.textInverse : colors.textMuted} />
        </Pressable>
      </View>
      {remaining < 200 ? (
        <Text style={styles.counter}>Còn {remaining} ký tự</Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 46,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 23,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: colors.border },
  sendBtnPressed: { backgroundColor: colors.inkSoft },
  counter: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
});
