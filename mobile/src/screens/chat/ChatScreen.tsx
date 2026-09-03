// UC-AI-01 — Hỏi trợ lý AI để được tư vấn sản phẩm.
// UC-AI-02 — Xem lại lịch sử hội thoại (nút đồng hồ ở đầu màn hình).
//
// Khác bản web ở chỗ căn bản: web để chat trong widget góc màn hình và xoá sạch khi đóng
// tab (sessionStorage). Ở đây chat là một màn hình đầy đủ — mục 3.1.b của tài liệu.
//
// Hội thoại đi qua /api/conversations: máy chủ lưu từng tin nhắn rồi tự dựng ngữ cảnh
// gửi cho Gemini, nên app chỉ giữ id phiên đang mở. Gemini tự gọi công cụ
// `search_products`, phía app không phải tự lọc sản phẩm.
//
// Nhờ vậy các phiên cũ (UC-AI-02) mở lại được nguyên mạch tư vấn, kể cả các sản phẩm
// đã gợi ý — chúng nằm trong `metadata` của tin nhắn.
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Screen from '../../components/Screen';
import BottomSheet from '../../components/BottomSheet';
import ProductThumb from '../../components/ProductThumb';
import Gradient from '../../components/Gradient';
import { chatApi, type ConversationMessage, type ConversationSummary } from '../../api/chat';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors, gradient, radius, shadow, spacing } from '../../theme';
import { formatDate, formatVND } from '../../utils/format';
import { getItems } from '../../types';
import type { ProductListItem } from '../../api/products';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: ProductListItem[];
  created_at: string;
}

// Giới hạn của backend: tin nhắn tối đa 2.000 ký tự (@MaxLength trong chat.dto.ts).
const MAX_MESSAGE_LENGTH = 2000;

// Lời chào là chữ của app, không phải tin nhắn từ máy chủ: nó không được lưu vào
// hội thoại nên cũng không lọt vào ngữ cảnh gửi cho Gemini.
const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content:
    'Chào bạn! Mình là trợ lý mua sắm của NexTech. Bạn cứ nói nhu cầu bằng lời thường thôi — ví dụ "laptop cho sinh viên dưới 20 triệu" — mình sẽ tra kho hàng thật rồi tư vấn.',
  created_at: new Date().toISOString(),
};

// Tin nhắn từ máy chủ -> tin nhắn để vẽ. `sender: 'agent'` là trợ lý.
function toChatMessage(m: ConversationMessage): ChatMessage {
  return {
    id: m.id,
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.content,
    products: m.metadata?.products,
    created_at: m.created_at,
  };
}

const SUGGESTIONS = [
  'Laptop cho sinh viên dưới 20 triệu',
  'Điện thoại chụp ảnh đẹp dưới 10 triệu',
  'Tai nghe chống ồn đi máy bay',
  'Đồng hồ thông minh đo nhịp tim',
];

export default function ChatScreen() {
  const navigation = useNavigation<Nav>();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const { isAuthenticated } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  // Phiên đang mở. null = chưa có, tin nhắn đầu tiên sẽ tạo.
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // null = đang tải danh sách phiên cũ.
  const [sessions, setSessions] = useState<ConversationSummary[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // Mỗi lần ngữ cảnh phiên đổi (mở phiên cũ, đổi tài khoản) thì tăng "đời phiên":
  // lượt gửi đang bay thuộc đời trước sẽ bị bỏ qua khi trả lời về muộn, không còn
  // chuyện câu trả lời của phiên A chèn vào cuối phiên B vừa mở.
  const epochRef = useRef(0);

  // Đăng nhập / đăng xuất thì bỏ phiên đang mở: phiên của tài khoản cũ không còn
  // thuộc về người đang cầm máy, gửi tiếp vào đó backend trả 403.
  useEffect(() => {
    epochRef.current += 1;
    setConversationId(null);
    setMessages([GREETING]);
    setThinking(false);
  }, [isAuthenticated]);

  const canSend = draft.trim().length > 0 && !thinking;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || thinking) return;

    // Vẽ câu hỏi ngay, không đợi máy chủ. Máy chủ có bản của riêng nó (id thật) —
    // bản tạm này chỉ sống trong màn hình cho tới khi mở lại phiên.
    const tempId = `u-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: 'user', content, created_at: new Date().toISOString() },
    ]);
    setDraft('');
    setThinking(true);
    const epoch = epochRef.current;

    try {
      // Phiên được tạo ở tin nhắn đầu tiên, không tạo sẵn lúc mở màn hình — mở ra rồi
      // thoát mà không hỏi gì thì không để lại phiên rỗng trong lịch sử.
      const id = conversationId ?? (await chatApi.createConversation()).id;
      if (epochRef.current !== epoch) return;
      if (!conversationId) setConversationId(id);

      const answer = await chatApi.sendMessage(id, content);
      if (epochRef.current !== epoch) return;
      setMessages((prev) => [...prev, toChatMessage(answer)]);
    } catch (err) {
      if (epochRef.current !== epoch) return;
      // Lỗi thì gỡ bong bóng tạm và trả nội dung về ô nhập: để bong bóng nằm lại là
      // lệch với lịch sử thật (gửi hỏng thì máy chủ không có tin này), còn xoá trắng
      // draft là bắt người dùng gõ lại từ đầu.
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(content);
      Alert.alert('Trợ lý chưa trả lời được', getErrorMessage(err));
    } finally {
      // Đời phiên đã đổi thì cờ thinking thuộc quyền của người đổi (openSession) —
      // không giẫm lên.
      if (epochRef.current === epoch) setThinking(false);
    }
  };

  const remaining = MAX_MESSAGE_LENGTH - draft.length;

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

  // Mở phiên cũ là hỏi tiếp được ngay trong phiên đó, không chỉ để đọc.
  const openSession = async (id: string) => {
    epochRef.current += 1;
    const epoch = epochRef.current;
    setHistoryOpen(false);
    setThinking(true);
    try {
      const res = await chatApi.messagesOf(id);
      if (epochRef.current !== epoch) return;
      setMessages(getItems(res).map(toChatMessage));
      setConversationId(id);
    } catch (err) {
      if (epochRef.current !== epoch) return;
      Alert.alert('Không mở được phiên tư vấn', getErrorMessage(err));
    } finally {
      if (epochRef.current === epoch) setThinking(false);
    }
  };

  return (
    <Screen>
      {/* ---- Đầu màn hình ---- */}
      <View style={styles.header}>
        <Gradient colors={gradient.brand} style={styles.avatar}>
          <Ionicons name="sparkles" size={18} color={colors.textInverse} />
        </Gradient>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Trợ lý NexTech</Text>
          <Text style={styles.headerSub}>Tư vấn dựa trên hàng đang có trong kho</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lịch sử hội thoại"
          onPress={openHistory}
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
          renderItem={renderItem}
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
        {messages.length <= 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionsBar}
            contentContainerStyle={styles.suggestions}
          >
            {SUGGESTIONS.map((s) => (
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
      <BottomSheet visible={historyOpen} onClose={() => setHistoryOpen(false)}>
          <Text style={styles.sheetTitle}>Các phiên tư vấn trước</Text>
          <Text style={styles.sheetHint}>
            Hội thoại được lưu trên máy chủ nên mở lại lúc nào cũng còn nguyên mạch tư vấn.
          </Text>

          {sessionsError ? (
            <Text style={styles.sheetEmpty}>{sessionsError}</Text>
          ) : sessions === null ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.sheetLoading} />
          ) : sessions.length === 0 ? (
            <Text style={styles.sheetEmpty}>Chưa có phiên tư vấn nào được lưu.</Text>
          ) : (
            // Danh sách phải cuộn được trong sheet có trần chiều cao — nhiều phiên mà
            // để View thường thì sheet tràn khỏi màn hình, các phiên cũ không bấm được.
            <ScrollView showsVerticalScrollIndicator={false}>
              {sessions.map((s) => (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  onPress={() => openSession(s.id)}
                  style={styles.sessionRow}
                >
                  <View style={styles.sessionIcon}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>
                      {s.title ?? 'Phiên tư vấn'}
                    </Text>
                    <Text style={styles.sessionMeta}>{formatDate(s.started_at)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </ScrollView>
          )}
      </BottomSheet>
    </Screen>
  );
}

const MessageBubble = memo(function MessageBubble({
  message,
  onProductPress,
}: {
  message: ChatMessage;
  onProductPress: (productId: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.msgWrap, isUser && styles.msgWrapUser]}>
      {/* Bong bóng của người dùng tô chuyển sắc, của trợ lý để trắng — hai bên khác
          nhau rõ ràng ngay cả khi đọc lướt. */}
      {isUser ? (
        <Gradient colors={gradient.brand} style={[styles.bubble, styles.bubbleUser]}>
          <Text style={[styles.msgText, styles.msgTextUser]}>{message.content}</Text>
        </Gradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleBot]}>
          <Text style={styles.msgText}>{message.content}</Text>
        </View>
      )}

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
              <ProductThumb uri={p.primary_image} icon={null} size={56} />
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
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    ...shadow.card,
    // Bóng phải phủ lên danh sách tin nhắn bên dưới, nếu không bị che mất.
    zIndex: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  list: { padding: spacing.lg, gap: spacing.lg },
  msgWrap: { gap: spacing.sm, alignItems: 'flex-start' },
  msgWrapUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '86%', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.xl },
  bubbleBot: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sm, ...shadow.card },
  bubbleUser: { borderTopRightRadius: radius.sm },
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
    ...shadow.card,
  },
  miniText: { flex: 1, gap: 2 },
  miniName: { fontSize: 12, color: colors.text, lineHeight: 17 },
  miniPrice: { fontSize: 13, fontWeight: '700', color: colors.primary },

  thinking: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  thinkingText: { fontSize: 13, color: colors.textMuted },

  // flexGrow:0 để dải chip chỉ cao bằng nội dung: ScrollView của React Native mặc
  // định có flexGrow:1, để nguyên thì nó giành hết chỗ trống rồi kéo từng chip cao
  // theo, mà chip bo góc pill nên phình thành hình tròn.
  suggestionsBar: { flexGrow: 0 },
  suggestions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
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
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.raised,
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
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sendBtnOff: { backgroundColor: colors.borderStrong, shadowOpacity: 0, elevation: 0 },
  counter: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.surface,
  },

  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  sheetEmpty: { fontSize: 13, color: colors.textMuted, paddingVertical: spacing.lg },
  sheetLoading: { paddingVertical: spacing.lg },
  sheetHint: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 19 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  sessionMeta: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
});
