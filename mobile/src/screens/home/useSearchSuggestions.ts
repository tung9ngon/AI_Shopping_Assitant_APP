import { useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';

import { productApi, type ProductListItem } from '../../api/products';
import { getItems } from '../../types';

// Gợi ý tìm kiếm: đợi ngừng gõ rồi mới gọi API, tối thiểu 2 ký tự, tối đa 6 dòng.
const SUGGEST_DEBOUNCE_MS = 350;
const SUGGEST_MIN_CHARS = 2;
const SUGGEST_LIMIT = 6;

// Gõ từ khoá là hiện gợi ý sản phẩm ngay dưới thanh tìm kiếm; bấm Tìm thì vẫn sang
// màn Sản phẩm với danh sách đầy đủ. Debounce + huỷ request cũ theo cùng cách màn
// thêm địa chỉ (AddressFormScreen) đang làm với gợi ý địa chỉ.
export function useSearchSuggestions() {
  const [keyword, setKeyword] = useState('');
  const [suggestions, setSuggestions] = useState<ProductListItem[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestEmpty, setSuggestEmpty] = useState(false);
  // Bấm chọn/bấm Tìm là đóng panel, nhưng lượt gọi đang bay (từ khoá không đổi nên
  // không bị huỷ) vẫn có thể trả về sau đó và mở panel lại — cờ này chặn kết quả trễ,
  // gõ tiếp mới được gợi ý trở lại.
  const suggestClosed = useRef(false);

  useEffect(() => {
    suggestClosed.current = false;
    const term = keyword.trim();
    if (term.length < SUGGEST_MIN_CHARS) {
      setSuggestions([]);
      setSuggestEmpty(false);
      setSuggesting(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await productApi.list({ search: term, limit: SUGGEST_LIMIT }, controller.signal);
        if (suggestClosed.current) return;
        const items = getItems(res);
        setSuggestions(items);
        setSuggestEmpty(items.length === 0);
      } catch {
        // Gợi ý chỉ là tiện ích — lỗi mạng thì im lặng, thanh tìm kiếm vẫn dùng được.
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setSuggestEmpty(false);
      } finally {
        if (!controller.signal.aborted) setSuggesting(false);
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [keyword]);

  const closeSuggestions = () => {
    suggestClosed.current = true;
    setSuggestions([]);
    setSuggestEmpty(false);
    setSuggesting(false);
    Keyboard.dismiss();
  };

  const showSuggestPanel =
    keyword.trim().length >= SUGGEST_MIN_CHARS && (suggesting || suggestions.length > 0 || suggestEmpty);

  return {
    keyword,
    setKeyword,
    suggestions,
    suggesting,
    suggestEmpty,
    showSuggestPanel,
    closeSuggestions,
  };
}
