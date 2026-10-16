import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import ProductThumb from '../../components/ProductThumb';
import { colors, font, radius, spacing } from '../../theme';
import { formatVND } from '../../utils/format';
import type { ChatMessage } from './chatMessage';

// Gemini trả lời bằng markdown nhẹ (**đậm**, gạch đầu dòng "* "). Vẽ nguyên văn thì
// dấu sao lộ ra như lỗi hiển thị; chỉ xử lý đúng hai dạng đó, phần còn lại giữ nguyên.
function renderInline(text: string) {
  return text.split('**').map((part, i) =>
    i % 2 === 1 ? (
      <Text key={i} style={styles.strong}>
        {part}
      </Text>
    ) : (
      part
    ),
  );
}

function renderMarkdown(content: string) {
  return content
    .split('\n')
    .map((line) => line.replace(/^(\s*)[*-]\s+/, '$1•  '))
    .map((line, i, lines) => (
      <Text key={i}>
        {renderInline(line)}
        {i < lines.length - 1 ? '\n' : null}
      </Text>
    ));
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
      {/* Bong bóng của người dùng màu mực, của trợ lý để trắng viền tóc — hai bên
          khác nhau rõ ràng ngay cả khi đọc lướt. */}
      {isUser ? (
        <View style={[styles.bubble, styles.bubbleUser]}>
          <Text style={[styles.msgText, styles.msgTextUser]}>{message.content}</Text>
        </View>
      ) : (
        <View style={[styles.bubble, styles.bubbleBot]}>
          <Text style={styles.msgText}>{renderMarkdown(message.content)}</Text>
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
              <ProductThumb uri={p.primary_image} icon={null} size={60} />
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

export default MessageBubble;

const styles = StyleSheet.create({
  msgWrap: { gap: spacing.sm, alignItems: 'flex-start' },
  msgWrapUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '86%', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.xl },
  bubbleBot: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  bubbleUser: { backgroundColor: colors.ink, borderTopRightRadius: radius.sm },
  msgText: { fontSize: 15, lineHeight: 22, color: colors.text },
  msgTextUser: { color: colors.textInverse },
  strong: { fontWeight: '700' },

  productStrip: { gap: spacing.sm, paddingVertical: spacing.xs },
  miniCard: {
    width: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  miniText: { flex: 1, gap: 3 },
  miniName: { fontSize: 12.5, fontWeight: '500', color: colors.text, lineHeight: 17 },
  miniPrice: { fontSize: 13.5, color: colors.ink, ...font.price },
});
