import { readFileSync } from 'fs';
import { join } from 'path';
import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { AutocompletePlaceDto, ReversePlaceDto } from './place.dto';

// Photon (komoot) — geocoder mã nguồn mở chạy trên dữ liệu OpenStreetMap.
// https://photon.komoot.io  ·  https://github.com/komoot/photon
//
// Chọn Photon vì đây là nguồn miễn phí duy nhất trong nhóm KHÔNG cần khoá API mà vẫn
// được phép dùng cho gõ-tới-đâu-gợi-ý-tới-đó: Nominatim (API chính chủ của OSM) cấm
// hẳn điều này trong Usage Policy, còn LocationIQ/Geoapify/Goong đều bắt đăng ký khoá.
//
// Đánh đổi phải biết:
//   - Dữ liệu OSM ở Việt Nam gần như không có SỐ NHÀ. Gợi ý chỉ tốt tới mức
//     đường + phường + tỉnh; số nhà người dùng tự gõ thêm vào ô.
//   - Máy chủ công cộng không cam kết uptime và giới hạn mềm ~1 request/giây. Dùng
//     quá tay sẽ bị chặn. Đi vào sản xuất thật thì phải tự dựng một bản Photon riêng.
const PHOTON_URL = 'https://photon.komoot.io/api/';
const PHOTON_REVERSE_URL = 'https://photon.komoot.io/reverse';

// Khung bao Việt Nam (minLon,minLat,maxLon,maxLat) — Photon lọc bỏ kết quả ngoài khung,
// nếu không gõ "Nguyen Trai" sẽ lẫn địa danh nước ngoài.
const VIETNAM_BBOX = '102.14,8.18,109.46,23.39';
const RESULT_LIMIT = 6;

// Chính sách của Photon yêu cầu dùng có chừng mực; khai danh tính ứng dụng để họ liên
// hệ được thay vì chặn thẳng.
const USER_AGENT = 'NexTech-Shopping-App/1.0 (+https://github.com/)';

// Các trường Photon trả về, xếp từ hẹp tới rộng — đúng thứ tự đọc địa chỉ tiếng Việt.
interface PhotonProperties {
  osm_id?: number;
  osm_type?: string;
  name?: string;
  housenumber?: string;
  street?: string;
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
}

// Photon trả GeoJSON với các trường rời rạc, KHÔNG có sẵn chuỗi địa chỉ hoàn chỉnh như
// Google/Goong — phải tự ghép. Bỏ phần rỗng và phần trùng nhau (nhiều nơi ở VN có
// city trùng state, vd "Hải Phòng, Hải Phòng").
function joinParts(parts: (string | undefined | null)[]): string {
  const seen = new Set<string>();
  return parts
    .map((p) => p?.trim())
    .filter((p): p is string => !!p && !seen.has(p) && (seen.add(p), true))
    .join(', ');
}

// GeoJSON: toạ độ đi theo thứ tự [kinh độ, vĩ độ] — ngược với cách người ta hay đọc.
interface PhotonFeature {
  properties?: PhotonProperties;
  geometry?: { coordinates?: [number, number] };
}

export interface PlaceItem {
  place_id: string;
  description: string;
  main_text: string | null;
  secondary_text: string | null;
  lat: number | null;
  lon: number | null;
}

// Dùng chung cho cả tìm-theo-chữ lẫn đổi-ngược-từ-toạ-độ: hai chiều trả về đúng một
// dạng dữ liệu nên app chỉ phải hiểu một kiểu.
function toPlaceItem(feature: PhotonFeature, index: number): PlaceItem {
  const p = feature.properties ?? {};
  // Số nhà viết liền với tên đường ("191 Phố Bà Triệu"), không ngăn bằng
  // dấu phẩy như các cấp hành chính phía sau.
  const streetLine = [p.housenumber, p.street]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  // Dòng đầu: tên địa điểm nếu có (POI, toà nhà), không thì số nhà + đường.
  const main = p.name || streetLine;
  // Dòng sau: phần còn lại từ hẹp tới rộng. Có tên địa điểm thì đường phải
  // xuống dòng dưới, nếu không sẽ mất thông tin đường.
  const secondary = joinParts([
    p.name ? streetLine : null,
    p.district,
    p.city,
    p.county,
    p.state,
    p.country,
  ]);
  const coordinates = feature.geometry?.coordinates;

  return {
    // Photon không có place_id; ghép osm_type + osm_id cho đủ duy nhất để
    // danh sách gợi ý bên app có khoá ổn định.
    place_id: `${p.osm_type ?? 'x'}${p.osm_id ?? index}`,
    description: joinParts([main, secondary]),
    main_text: main || null,
    secondary_text: secondary || null,
    lon: coordinates?.[0] ?? null,
    lat: coordinates?.[1] ?? null,
  };
}

// Cây đơn vị hành chính 63 tỉnh → quận/huyện → phường/xã, bản rút gọn chỉ còn
// code + name (nguồn provinces.open-api.vn/api/v1, tải ngày 2026-09-18). Đóng gói
// tĩnh thay vì gọi API ngoài mỗi lượt: dữ liệu gần như không đổi và màn thêm địa chỉ
// không được chết theo dịch vụ bên thứ ba. File được nest-cli copy vào dist qua mục
// assets trong nest-cli.json.
interface WardNode {
  code: number;
  name: string;
}
interface DistrictNode extends WardNode {
  wards: WardNode[];
}
interface ProvinceNode extends WardNode {
  districts: DistrictNode[];
}

let divisionsCache: ProvinceNode[] | null = null;
function loadDivisions(): ProvinceNode[] {
  divisionsCache ??= JSON.parse(
    readFileSync(join(__dirname, 'vn-divisions.json'), 'utf8'),
  ) as ProvinceNode[];
  return divisionsCache;
}

@Injectable()
export class PlaceService {
  // GET /api/places/provinces
  provinces() {
    return { items: loadDivisions().map(({ code, name }) => ({ code, name })) };
  }

  // GET /api/places/districts?province_code=...
  districts(provinceCode: number) {
    const province = loadDivisions().find((p) => p.code === provinceCode);
    if (!province) throw new NotFoundException('Không tìm thấy tỉnh/thành phố');
    return { items: province.districts.map(({ code, name }) => ({ code, name })) };
  }

  // GET /api/places/wards?district_code=...
  wards(districtCode: number) {
    for (const province of loadDivisions()) {
      const district = province.districts.find((d) => d.code === districtCode);
      if (district) {
        return { items: district.wards.map(({ code, name }) => ({ code, name })) };
      }
    }
    throw new NotFoundException('Không tìm thấy quận/huyện');
  }

  private async fetchPhoton(url: string): Promise<PhotonFeature[]> {
    let res: Response;
    try {
      res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    } catch {
      throw new BadGatewayException('Không kết nối được tới dịch vụ tìm địa chỉ');
    }

    if (!res.ok) {
      throw new BadGatewayException(
        `Dịch vụ tìm địa chỉ từ chối yêu cầu (HTTP ${res.status})`,
      );
    }

    const body = (await res.json()) as { features?: PhotonFeature[] };
    return body.features ?? [];
  }

  // GET /api/places/reverse — người dùng thả ghim trên bản đồ, đổi ngược ra địa chỉ.
  async reverse(dto: ReversePlaceDto) {
    const url = `${PHOTON_REVERSE_URL}?lat=${dto.lat}&lon=${dto.lon}&lang=default&limit=1`;
    const features = await this.fetchPhoton(url);

    // Thả ghim giữa ruộng/biển thì OSM không có gì để trả — không phải lỗi, app tự
    // báo "chưa xác định được địa chỉ" và mời người dùng kéo ghim chỗ khác.
    const item = features.length ? toPlaceItem(features[0], 0) : null;
    return { item: item?.description ? item : null };
  }

  async autocomplete(dto: AutocompletePlaceDto) {
    const url =
      `${PHOTON_URL}?q=${encodeURIComponent(dto.input)}` +
      `&limit=${RESULT_LIMIT}&bbox=${VIETNAM_BBOX}&lang=default`;
    const features = await this.fetchPhoton(url);

    return {
      items: features.map(toPlaceItem).filter((item) => !!item.description),
    };
  }
}
