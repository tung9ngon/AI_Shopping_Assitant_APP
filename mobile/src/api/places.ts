// Nhóm /api/places — gợi ý địa chỉ, backend lấy từ Photon (geocoder nền OpenStreetMap).
//
// Không cần khoá API. App vẫn gọi qua backend chứ không gọi thẳng Photon: máy chủ dồn
// được lưu lượng về một nơi (Photon giới hạn mềm ~1 request/giây) và sau này đổi nhà
// cung cấp thì chỉ sửa backend. Gợi ý hỏng vì mạng/dịch vụ thì màn thêm địa chỉ hiện
// lời nhắn và vẫn cho gõ tay.
import { api } from './client';

export interface PlaceSuggestion {
  place_id: string;
  // Chuỗi địa chỉ đầy đủ của gợi ý — đây chính là thứ ghi vào full_address.
  description: string;
  main_text: string | null;
  secondary_text: string | null;
  // Toạ độ của gợi ý: dùng để mở màn bản đồ đúng ngay chỗ vừa chọn thay vì rơi về
  // điểm mặc định. Null khi Photon không trả hình học cho bản ghi đó.
  lat: number | null;
  lon: number | null;
}

// Đơn vị hành chính cho bộ chọn Tỉnh/TP → Quận/Huyện → Phường/Xã ở màn thêm địa chỉ.
// Dữ liệu tĩnh 63 tỉnh đóng gói trong backend (vn-divisions.json), không đi qua Photon.
export interface DivisionItem {
  code: number;
  name: string;
}

export const placeApi = {
  autocomplete: (input: string, signal?: AbortSignal) =>
    api.get<{ items: PlaceSuggestion[] }>('/places/autocomplete', { input }, { signal }),

  provinces: (signal?: AbortSignal) =>
    api.get<{ items: DivisionItem[] }>('/places/provinces', undefined, { signal }),

  districts: (provinceCode: number, signal?: AbortSignal) =>
    api.get<{ items: DivisionItem[] }>('/places/districts', { province_code: provinceCode }, { signal }),

  wards: (districtCode: number, signal?: AbortSignal) =>
    api.get<{ items: DivisionItem[] }>('/places/wards', { district_code: districtCode }, { signal }),

  // Thả ghim trên bản đồ -> chuỗi địa chỉ. `item` là null khi điểm đó không có gì
  // trong dữ liệu OpenStreetMap (giữa ruộng, giữa biển) — không phải lỗi.
  reverse: (lat: number, lon: number, signal?: AbortSignal) =>
    api.get<{ item: PlaceSuggestion | null }>('/places/reverse', { lat, lon }, { signal }),
};
