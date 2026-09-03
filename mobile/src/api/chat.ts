// Trợ lý AI, đi qua nhóm /api/conversations.
//
// Hội thoại lưu trên máy chủ: app chỉ giữ id phiên đang mở, lịch sử do backend đọc từ
// DB rồi gửi cho Gemini — app không phải gửi lại toàn bộ tin nhắn mỗi lượt.
//
// Guest dùng được: POST /conversations không có cookie đăng nhập thì backend cấp cookie
// httpOnly `guest_id` (định danh THIẾT BỊ, hạn 1 năm) và tạo phiên với user_id NULL.
// Chỉ máy giữ đúng cookie đó mới đọc/ghi được phiên — biết id thôi thì không đủ.
//
// Phiên khách không nằm trong GET /conversations (danh sách "của tôi" cần đăng nhập),
// nên đăng nhập xong phải gọi `claimConversations` để kéo chúng về tài khoản.
//
// Còn một nhóm nữa là POST /api/chat — cùng Gemini, cùng công cụ search_products,
// nhưng không lưu gì. App không dùng vì cần lịch sử cho UC-AI-02.
import { api } from './client';
import { mapItems } from '../types';
import type { Paginated } from '../types';
import { normalizeProductListItem, type ProductListItem } from './products';

export interface ConversationSummary {
  id: string;
  title: string | null;
  channel: 'chat' | 'voice';
  current_step: string;
  started_at: string;
  ended_at: string | null;
}

// Sản phẩm Gemini gợi ý được lưu vào `metadata` của tin nhắn, nên mở lại phiên cũ vẫn
// thấy đúng những sản phẩm đã gợi ý lúc đó (giá có thể đã đổi kể từ đấy).
export interface ConversationMessage {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  message_type: 'text' | 'product_card' | 'comparison_table';
  metadata: { products?: ProductListItem[] } | null;
  created_at: string;
}

// Giá trong metadata cũng là chuỗi decimal như mọi chỗ khác — ép về number
// trước khi ra khỏi tầng API.
function normalizeMessage(m: ConversationMessage): ConversationMessage {
  if (!m.metadata?.products) return m;
  return {
    ...m,
    metadata: { ...m.metadata, products: m.metadata.products.map(normalizeProductListItem) },
  };
}

export const chatApi = {
  createConversation: () =>
    api.post<{ id: string; channel: string; current_step: string; started_at: string }>(
      '/conversations',
      { channel: 'chat' },
    ),
  // Trả về TIN NHẮN CỦA TRỢ LÝ; tin của người dùng backend đã tự lưu trước đó.
  // Timeout riêng 90s: backend gọi Gemini kèm tool tìm sản phẩm, quá 15s là bình
  // thường — cắt sớm thì backend vẫn chạy tiếp và lưu cả hỏi lẫn đáp, còn app lại
  // báo lỗi oan khiến người dùng gửi trùng câu hỏi.
  sendMessage: (conversationId: string, content: string) =>
    api
      .post<ConversationMessage>(
        `/conversations/${conversationId}/messages`,
        { content },
        { timeoutMs: 90_000 },
      )
      .then(normalizeMessage),

  // Gọi ngay sau khi đăng nhập: gán các phiên hỏi lúc chưa đăng nhập trên máy này cho
  // tài khoản vừa vào. Gọi lại nhiều lần vô hại — không còn gì để gán thì trả 0.
  claimConversations: () => api.post<{ claimed: number }>('/conversations/claim'),

  listConversations: () => api.get<ConversationSummary[]>('/conversations'),
  // Giới hạn 100 tin là CHỦ ĐỊNH chấp nhận: phiên tư vấn mua sắm hiếm khi dài hơn,
  // và màn chat không có phân trang ngược. Phiên dài quá 100 tin thì phần vượt bị
  // cắt im lặng — nếu thành vấn đề thật thì phải thêm phân trang ở ChatScreen.
  messagesOf: (conversationId: string) =>
    api
      .get<Paginated<ConversationMessage>>(`/conversations/${conversationId}/messages`, {
        limit: 100,
      })
      .then((res) => mapItems(res, normalizeMessage)),
};
