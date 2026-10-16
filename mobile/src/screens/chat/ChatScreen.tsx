
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import Screen from '../../components/Screen';
import { chatApi, type ConversationSummary } from '../../api/chat';
import { getErrorMessage } from '../../api/client';
import { colors, radius, spacing } from '../../theme';
import type { RootStackParamList, TabParamList } from '../../navigation/types';
import type { ChatMessage } from './chatMessage';
import { useChatSession } from './useChatSession';
import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';
import SuggestionChips from './SuggestionChips';
import ChatComposer from './ChatComposer';
import HistorySheet from './HistorySheet';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ChatScreen() {
  const navigation = useNavigation<Nav>();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const { messages, draft, setDraft, thinking, send, openSession } = useChatSession();

  // Câu hỏi mẫu từ khối "Bắt đầu theo nhu cầu" ở trang chủ: gửi ngay rồi xoá khỏi
  // tham số tuyến, để quay lại tab Chat không gửi lặp. Trợ lý còn đang trả lời câu
  // trước thì không gửi chồng (send sẽ bỏ qua) — đặt vào ô nhập để người dùng tự gửi.
  const route = useRoute<RouteProp<TabParamList, 'Chat'>>();
  const tabNav = useNavigation<BottomTabNavigationProp<TabParamList, 'Chat'>>();
  const prompt = route.params?.prompt;
  useEffect(() => {
    if (!prompt) return;
    if (thinking) setDraft(prompt);
    else send(prompt);
    tabNav.setParams({ prompt: undefined });
    // Chỉ phản ứng khi có câu hỏi mẫu mới, không phải mỗi lần thinking đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  const [historyOpen, setHistoryOpen] = useState(false);
  // null = đang tải danh sách phiên cũ.
  const [sessions, setSessions] = useState<ConversationSummary[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // renderItem ổn định + MessageBubble bọc memo: gõ draft trong composer không vẽ lại
  // cả trăm bong bóng (kèm dải sản phẩm) của hội thoại dài theo từng phím.
  const onProductPress = useCallback(
    (id: string) => navigation.navigate('ProductDetail', { productId: id }),
    [navigation],
  );
  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble message={item} onProductPress={onProductPress} />
    ),
    [onProductPress],
  );

  // UC-AI-02 — các phiên tư vấn cũ lưu trên máy chủ. Cần đăng nhập; chưa đăng nhập thì
  // backend trả 401 và màn hình hiện đúng thông báo đó.
  // Đóng rồi mở lại sheet khi lượt tải trước còn đang bay thì hai response chồng
  // nhau — chỉ nhận kết quả của lượt mở mới nhất, cùng kiểu chặn của epochRef.
  const historySeq = useRef(0);
  const openHistory = async () => {
    const seq = ++historySeq.current;
    setHistoryOpen(true);
    setSessions(null);
    setSessionsError(null);
    try {
      const list = await chatApi.listConversations();
      if (historySeq.current === seq) setSessions(list);
    } catch (err) {
      if (historySeq.current === seq) setSessionsError(getErrorMessage(err));
    }
  };

  const selectSession = (id: string) => {
    setHistoryOpen(false);
    openSession(id);
  };

  return (
    <Screen>
      <ChatHeader onHistoryPress={openHistory} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={renderItem}
          ListFooterComponent={
            thinking ? (
              <View style={styles.thinking}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={styles.thinkingText}>Đang tra kho hàng…</Text>
              </View>
            ) : null
          }
        />

        {messages.length <= 1 ? <SuggestionChips onPick={send} /> : null}

        <ChatComposer
          draft={draft}
          onChangeDraft={setDraft}
          onSend={() => send(draft)}
          busy={thinking}
        />
      </KeyboardAvoidingView>

      <HistorySheet
        visible={historyOpen}
        sessions={sessions}
        error={sessionsError}
        onClose={() => setHistoryOpen(false)}
        onSelect={selectSession}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.lg },
  // Trạng thái chờ mang dáng bong bóng của trợ lý: câu trả lời sẽ hiện đúng chỗ này.
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    borderTopLeftRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  thinkingText: { fontSize: 13.5, color: colors.textSecondary },
});
