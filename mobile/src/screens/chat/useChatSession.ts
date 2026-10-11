import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { chatApi } from '../../api/chat';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { getItems } from '../../types';
import { GREETING, toChatMessage, type ChatMessage } from './chatMessage';

// Phiên chat đang mở: danh sách tin nhắn, ô nhập, gửi câu hỏi và mở lại phiên cũ.
export function useChatSession() {
  const { isAuthenticated } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  // Phiên đang mở. null = chưa có, tin nhắn đầu tiên sẽ tạo.
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);

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

  // Mở phiên cũ là hỏi tiếp được ngay trong phiên đó, không chỉ để đọc.
  const openSession = async (id: string) => {
    epochRef.current += 1;
    const epoch = epochRef.current;
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

  return { messages, draft, setDraft, thinking, send, openSession };
}
