import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AutocompletePlaceDto } from './place.dto';

// Goong — dịch vụ bản đồ Việt Nam, API mô phỏng đúng Google Places nên đổi qua lại
// chỉ phải sửa file này. https://rsapi.goong.io + tài khoản ở https://account.goong.io
//
// Chọn Goong thay Google: gói miễn phí 30.000 request/tháng và KHÔNG cần thẻ tín dụng
// (Google bắt bật billing), còn dữ liệu số nhà/đường/phường ở Việt Nam thì hơn hẳn các
// nguồn nền OpenStreetMap (Photon, LocationIQ, Geoapify) — OSM VN gần như trống số nhà.
const AUTOCOMPLETE_URL = 'https://rsapi.goong.io/Place/AutoComplete';

// Gọi qua backend chứ không gọi thẳng từ app: khoá API nằm ở .env của máy chủ, không
// nằm trong file cài đặt gửi tới máy người dùng.
@Injectable()
export class PlaceService {
  constructor(private readonly config: ConfigService) {}

  async autocomplete(dto: AutocompletePlaceDto) {
    const apiKey = this.config.get<string>('goong.apiKey');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình GOONG_API_KEY nên chưa gợi ý được địa chỉ',
      );
    }

    const url = `${AUTOCOMPLETE_URL}?api_key=${encodeURIComponent(apiKey)}&input=${encodeURIComponent(dto.input)}`;

    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      throw new BadGatewayException('Không kết nối được tới Goong Maps');
    }

    if (!res.ok) {
      const detail = await res.text();
      throw new BadGatewayException(
        `Goong từ chối yêu cầu (HTTP ${res.status}): ${detail.slice(0, 200)}`,
      );
    }

    const body = (await res.json()) as {
      // Khoá sai/hết hạn mức: Goong vẫn trả HTTP 200 nhưng kèm object `error`.
      error?: { code?: string; message?: string };
      predictions?: {
        place_id?: string;
        description?: string;
        structured_formatting?: { main_text?: string; secondary_text?: string };
      }[];
    };

    if (body.error) {
      throw new BadGatewayException(
        `Goong báo lỗi: ${body.error.message ?? body.error.code ?? 'không rõ nguyên nhân'}`,
      );
    }

    // `description` là chuỗi địa chỉ đầy đủ của gợi ý — chính là thứ ghi vào
    // full_address. Đọc phòng thủ: thiếu description thì ghép lại từ hai phần rời.
    return {
      items: (body.predictions ?? [])
        .filter((p) => !!p.place_id)
        .map((p) => {
          const main = p.structured_formatting?.main_text ?? null;
          const secondary = p.structured_formatting?.secondary_text ?? null;
          return {
            place_id: p.place_id as string,
            description:
              p.description ?? [main, secondary].filter(Boolean).join(', '),
            main_text: main,
            secondary_text: secondary,
          };
        })
        .filter((p) => !!p.description),
    };
  }
}
