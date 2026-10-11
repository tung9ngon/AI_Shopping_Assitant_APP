import type { ConversationMessage } from '../../api/chat';
import type { ProductListItem } from '../../api/products';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: ProductListItem[];
  created_at: string;
}

// Giới hạn của backend: tin nhắn tối đa 2.000 ký tự (@MaxLength trong chat.dto.ts).
export const MAX_MESSAGE_LENGTH = 2000;

// Lời chào là chữ của app, không phải tin nhắn từ máy chủ: nó không được lưu vào
// hội thoại nên cũng không lọt vào ngữ cảnh gửi cho Gemini.
export const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content:
    'Chào bạn! Mình là trợ lý mua sắm của NexTech. Bạn không cần biết trước tên hay cấu hình sản phẩm — cứ kể ngành học, việc cần làm và ngân sách, ví dụ "Tôi học thiết kế đồ họa, cần laptop trong ngân sách 20 triệu". Mình sẽ tra kho hàng thật rồi tư vấn, kho chưa có món phù hợp thì mình nói rõ.',
  created_at: new Date().toISOString(),
};

// Tin nhắn từ máy chủ -> tin nhắn để vẽ. `sender: 'agent'` là trợ lý.
export function toChatMessage(m: ConversationMessage): ChatMessage {
  return {
    id: m.id,
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.content,
    products: m.metadata?.products,
    created_at: m.created_at,
  };
}
