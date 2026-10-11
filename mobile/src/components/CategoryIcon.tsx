// Vẽ biểu tượng của danh mục.
//
// Backend để trường `icon` tự do, thực tế đang chứa **emoji** ('💻', '📱', '🎧'…) hoặc
// **URL ảnh** bất kỳ — không phải mã Ionicons. Emoji mỗi hệ điều hành vẽ một kiểu, màu
// sắc lệch hẳn với giao diện, nên không vẽ emoji nữa: tra theo **tên** danh mục ra
// glyph Ionicons cùng một nét vẽ. Chỉ khi tên không khớp mới dùng ảnh URL (nếu có),
// cuối cùng là glyph dự phòng.
// (Đưa thẳng emoji vào <Ionicons name={...}> thì thư viện vẽ '?' — `glyphMap[name] || '?'`.)
import { Image } from 'react-native';
import Ionicons, { type IoniconsIconName } from '@react-native-vector-icons/ionicons/static';

// Khớp theo từ khoá trong tên đã bỏ dấu, thứ tự quan trọng: "máy tính bảng" phải
// được bắt trước "máy tính".
const NAME_ICONS: [RegExp, IoniconsIconName][] = [
  [/bang|tablet|ipad/, 'tablet-portrait-outline'],
  [/laptop|notebook|macbook/, 'laptop-outline'],
  [/dien thoai|phone|smartphone/, 'phone-portrait-outline'],
  [/may tinh ban|desktop|pc\b/, 'desktop-outline'],
  [/man hinh|monitor/, 'tv-outline'],
  [/tai nghe|headphone|earbud/, 'headset-outline'],
  [/loa|speaker/, 'volume-high-outline'],
  [/dong ho|watch/, 'watch-outline'],
  [/linh kien|component|chip|ram|cpu/, 'hardware-chip-outline'],
  [/phu kien|accessor/, 'bag-handle-outline'],
  [/camera|may anh/, 'camera-outline'],
  [/game|choi/, 'game-controller-outline'],
  [/ke toan|accounting/, 'calculator-outline'],
  [/seo/, 'trending-up-outline'],
  [/social|mang xa hoi/, 'share-social-outline'],
];

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

export function iconForCategory(name?: string | null): IoniconsIconName | null {
  if (!name) return null;
  const key = normalize(name);
  return NAME_ICONS.find(([re]) => re.test(key))?.[1] ?? null;
}

export default function CategoryIcon({
  name,
  icon,
  size,
  color,
  fallback = 'cube-outline',
}: {
  /** Tên danh mục — nguồn chính để chọn glyph. */
  name?: string | null;
  /** Trường `icon` thô của backend; chỉ dùng khi là URL ảnh. */
  icon?: string | null;
  size: number;
  color: string;
  fallback?: IoniconsIconName;
}) {
  const glyph = iconForCategory(name);
  if (glyph) return <Ionicons name={glyph} size={size} color={color} />;

  const value = icon?.trim();
  if (value && /^https?:\/\//i.test(value)) {
    return (
      <Image source={{ uri: value }} style={{ width: size, height: size }} resizeMode="contain" />
    );
  }

  return <Ionicons name={fallback} size={size} color={color} />;
}
