// UC-AI-01 — Hỏi trợ lý AI để được tư vấn sản phẩm.
// UC-AI-02 — Xem lại lịch sử hội thoại (nút đồng hồ ở đầu màn hình).
//
// Khác bản web ở chỗ căn bản: web để chat trong widget góc màn hình và xoá sạch khi đóng
// tab (sessionStorage). Ở đây chat là một màn hình đầy đủ — mục 3.1.b của tài liệu.
//
// Phần trả lời hiện là mô phỏng tại chỗ. Khi đấu API thật, hàm `askAssistant` bên dưới
// được thay bằng lời gọi tới nhóm endpoint /chat và /conversations của backend; Gemini
// tự gọi công cụ `search_products` nên phía app không phải tự lọc sản phẩm.
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import ProductThumb from '../../components/ProductThumb';
import { colors, radius, shadow, spacing } from '../../theme';
import { formatVND } from '../../utils/format';
import { mockChatHistory, mockChatSuggestions, mockProducts, type ChatMessage } from '../../mocks/data';
import type { RootStackParamList } from '../../navigation/types';
import type { Product } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Giới hạn lấy từ backend hiện tại: mỗi lượt tra cứu trả tối đa 6 sản phẩm,
// tin nhắn tối đa 2.000 ký tự.
const MAX_PRODUCTS_PER_TURN = 6;
const MAX_MESSAGE_LENGTH = 2000;

// Mô phỏng vòng gọi công cụ `search_products`: khớp từ khoá và ngưỡng giá trong câu hỏi.
function askAssistant(question: string): { content: string; products: Product[] } {
  const q = question.toLowerCase();

  const budgetMatch = q.match(/(\d+([.,]\d+)?)\s*(triệu|tr\b|củ)/);
  const budget = budgetMatch ? parseFloat(budgetMatch[1].replace(',', '.')) * 1_000_000 : null;

  const keywords = ['laptop', 'điện thoại', 'tai nghe', 'đồng hồ', 'máy tính bảng', 'sạc'];
  const hit = keywords.find((k) => q.includes(k));

  let found = mockProducts.filter((p) => {
    if (hit) {
      const haystack = `${p.name} ${p.category?.name ?? ''}`.toLowerCase();
      if (!haystack.includes(hit)) return false;
    }
    if (budget && Number(p.price) > budget * 1.15) return false;
    return true;
  });

  if (found.length === 0) found = mockProducts.slice(0, 3);
  found = found.sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0)).slice(0, MAX_PRODUCTS_PER_TURN);

  const budgetText = budget ? ` trong tầm ${formatVND(budget)}` : '';
  const content =
    `Mình vừa tra kho hàng và tìm được ${found.length} sản phẩm phù hợp${budgetText}. ` +
    `Đứng đầu là ${found[0].name} — ${found[0].description?.split('.')[0] ?? 'đáng cân nhắc'}.\n\n` +
    `Bạn bấm vào sản phẩm bên dưới để xem chi tiết, hoặc nói thêm về nhu cầu để mình lọc kỹ hơn nhé.`;

  return { content, products: found };
}

export default function ChatScreen() {
  const navigation = useNavigation<Nav>();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(mockChatHistory);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const canSend = draft.trim().length > 0 && !thinking;

  const send = (text: string) => {
    const content = text.trim();
    if (!content || thinking) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setDraft('');
    setThinking(true);

    // Độ trễ giả để thấy được trạng thái "đang soạn" — thay bằng gọi API thật sau này.
    setTimeout(() => {
      const answer = askAssistant(content);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: answer.content,
          products: answer.products,
          created_at: new Date().toISOString(),
        },
      ]);
      setThinking(false);
    }, 900);
  };

  const remaining = MAX_MESSAGE_LENGTH - draft.length;

  // Các phiên tư vấn cũ (UC-AI-02). Bản web mất sạch phần này khi đóng tab.
  const pastSessions = useMemo(
    () => [
      { id: 's1', title: 'Laptop cho sinh viên 16 triệu', at: 'Hôm nay, 14:02', count: 3 },
      { id: 's2', title: 'Tai nghe chống ồn đi máy bay', at: '19/08/2026', count: 6 },
      { id: 's3', title: 'Điện thoại pin trâu dưới 8 triệu', at: '11/08/2026', count: 4 },
    ],
    [],
  );

  return (
    <Screen>
      {/* ---- Đầu màn hình ---- */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="sparkles" size={18} color={colors.textInverse} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Trợ lý NexTech</Text>
          <Text style={styles.headerSub}>Tư vấn dựa trên hàng đang có trong kho</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lịch sử hội thoại"
          onPress={() => setHistoryOpen(true)}
          hitSlop={8}
        >
          <Ionicons name="time-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

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
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              onProductPress={(id) => navigation.navigate('ProductDetail', { productId: id })}
            />
          )}
          ListFooterComponent={
            thinking ? (
              <View style={styles.thinking}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.thinkingText}>Đang tra kho hàng…</Text>
              </View>
            ) : null
          }
        />

        {/* ---- Gợi ý câu hỏi ---- */}
        {messages.length <= mockChatHistory.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestions}
          >
            {mockChatSuggestions.map((s) => (
              <Pressable
                key={s}
                accessibilityRole="button"
                onPress={() => send(s)}
                style={styles.suggestionChip}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {/* ---- Ô nhập ---- */}
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={(t) => setDraft(t.slice(0, MAX_MESSAGE_LENGTH))}
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
            onPress={() => send(draft)}
            disabled={!canSend}
            style={[styles.sendBtn, !canSend && styles.sendBtnOff]}
          >
            <Ionicons name="arrow-up" size={20} color={colors.textInverse} />
          </Pressable>
        </View>
        {remaining < 200 ? (
          <Text style={styles.counter}>Còn {remaining} ký tự</Text>
        ) : null}
      </KeyboardAvoidingView>

      {/* ---- UC-AI-02: lịch sử hội thoại ---- */}
      <Modal visible={historyOpen} transparent animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setHistoryOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Các phiên tư vấn trước</Text>
          <Text style={styles.sheetHint}>
            Hội thoại được lưu trên máy chủ nên mở lại lúc nào cũng còn nguyên mạch tư vấn.
          </Text>
          {pastSessions.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              onPress={() => setHistoryOpen(false)}
              style={styles.sessionRow}
            >
              <View style={styles.sessionIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.sessionTitle} numberOfLines={1}>
                  {s.title}
                </Text>
                <Text style={styles.sessionMeta}>
                  {s.at} · {s.count} sản phẩm được gợi ý
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </Modal>
    </Screen>
  );
}

function MessageBubble({
  message,
  onProductPress,
}: {
  message: ChatMessage;
  onProductPress: (productId: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.msgWrap, isUser && styles.msgWrapUser]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={[styles.msgText, isUser && styles.msgTextUser]}>{message.content}</Text>
      </View>

      {/* Sản phẩm AI gợi ý — bấm là mở thẳng trang chi tiết (bước cuối của luồng chính) */}
      {message.products?.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productStrip}
        >
          {message.products.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${formatVND(p.price)}`}
              onPress={() => onProductPress(p.id)}
              style={styles.miniCard}
            >
              <ProductThumb uri={null} icon={p.category?.icon} size={56} />
              <View style={styles.miniText}>
                <Text style={styles.miniName} numberOfLines={2}>
                  {p.name}
                </Text>
                <Text style={styles.miniPrice}>{formatVND(p.price)}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  list: { padding: spacing.lg, gap: spacing.lg },
  msgWrap: { gap: spacing.sm, alignItems: 'flex-start' },
  msgWrapUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '86%', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.lg },
  bubbleBot: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sm, ...shadow.card },
  bubbleUser: { backgroundColor: colors.primary, borderTopRightRadius: radius.sm },
  msgText: { fontSize: 14, lineHeight: 21, color: colors.text },
  msgTextUser: { color: colors.textInverse },

  productStrip: { gap: spacing.sm, paddingVertical: spacing.xs },
  miniCard: {
    width: 210,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniText: { flex: 1, gap: 2 },
  miniName: { fontSize: 12, color: colors.text, lineHeight: 17 },
  miniPrice: { fontSize: 13, fontWeight: '700', color: colors.primary },

  thinking: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  thinkingText: { fontSize: 13, color: colors.textMuted },

  suggestions: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  suggestionChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: colors.borderStrong },
  counter: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.surface,
  },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    ...shadow.raised,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  sheetHint: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 19 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  sessionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  sessionMeta: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
});
