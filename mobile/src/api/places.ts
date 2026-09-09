// Nhóm /api/places — gợi ý địa chỉ lấy từ Goong Maps, gọi qua backend.
//
// App KHÔNG gọi thẳng Goong: khoá API nằm ở .env của máy chủ. Chưa khai GOONG_API_KEY
// thì backend trả 503 kèm lời nhắn — màn thêm địa chỉ hiện lời nhắn đó và vẫn cho gõ tay.
import { api } from './client';

export interface PlaceSuggestion {
  place_id: string;
  // Chuỗi địa chỉ đầy đủ của gợi ý — đây chính là thứ ghi vào full_address.
  description: string;
  main_text: string | null;
  secondary_text: string | null;
}

export const placeApi = {
  autocomplete: (input: string, signal?: AbortSignal) =>
    api.get<{ items: PlaceSuggestion[] }>('/places/autocomplete', { input }, { signal }),
};
