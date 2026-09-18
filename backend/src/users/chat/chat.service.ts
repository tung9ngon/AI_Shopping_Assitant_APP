import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductService } from '../product/product.service';
import { ChatDto } from './chat.dto';

// FPT AI Marketplace — API chuẩn OpenAI chat completions.
// Cách tích hợp: https://github.com/fpt-corp/ai-marketplace
const FPT_BASE_URL = 'https://mkp-api.fptcloud.com';

// Khai báo công cụ (định dạng OpenAI tools) để model tự gọi khi cần tra sản phẩm thật.
const SEARCH_PRODUCTS_TOOL = {
  type: 'function',
  function: {
    name: 'search_products',
    description:
      'Tìm sản phẩm trong cửa hàng theo từ khoá tên, hãng, hoặc khoảng giá. Dùng khi khách hỏi về sản phẩm, nhu cầu, hoặc giá.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Từ khoá khớp TÊN sản phẩm — dùng cho tên/dòng máy cụ thể, ví dụ: "MacBook Air", "Galaxy S24". KHÔNG đặt loại sản phẩm chung chung ("đồng hồ", "laptop") vào đây — loại sản phẩm thì dùng tham số category.',
        },
        category: {
          type: 'string',
          description:
            'Tên danh mục, phải là MỘT trong các danh mục liệt kê ở hướng dẫn hệ thống, ví dụ: "Đồng hồ", "Laptop". Dùng khi khách hỏi theo loại sản phẩm.',
        },
        brand: { type: 'string', description: 'Hãng, ví dụ: "Dell", "Asus"' },
        minPrice: { type: 'number', description: 'Giá tối thiểu (VNĐ)' },
        maxPrice: { type: 'number', description: 'Giá tối đa (VNĐ)' },
      },
    },
  },
} as const;

// Phần tối thiểu của response /chat/completions mà service này cần đọc.
interface FptToolCall {
  id: string;
  function: { name: string; arguments: string };
}
interface FptCompletion {
  choices?: {
    message?: {
      content?: string | null;
      tool_calls?: FptToolCall[];
    };
  }[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly apiKey: string;
  private readonly modelName: string;

  constructor(
    private readonly config: ConfigService,
    private readonly productService: ProductService,
  ) {
    this.apiKey = this.config.get<string>('fpt.apiKey') ?? '';
    this.modelName =
      this.config.get<string>('fpt.model') ?? 'DeepSeek-V4-Flash';
  }

  async chat(dto: ChatDto) {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình FPT_KEY trong .env của backend',
      );
    }

    const [brands, categories] = await Promise.all([
      this.productService.findAllBrands(),
      this.productService.findAllCategories(),
    ]);
    const systemInstruction = `Bạn là trợ lý mua sắm của "AI Shop" - cửa hàng bán đồ điện tử (laptop, điện thoại, đồng hồ thông minh, phụ kiện...).
Nhiệm vụ: tư vấn và gợi ý sản phẩm phù hợp nhu cầu của khách.
Các hãng đang có: ${brands.length ? brands.join(', ') : 'đang cập nhật'}.
Các danh mục đang có: ${categories.length ? categories.map((c) => c.name).join(', ') : 'đang cập nhật'}.
QUY TẮC:
- Khi khách hỏi về sản phẩm, nhu cầu, hoặc giá: LUÔN dùng công cụ search_products để tra sản phẩm THẬT rồi tư vấn dựa trên kết quả.
- Khách hỏi theo LOẠI sản phẩm (kể cả gõ tiếng Việt không dấu, vd "dong ho deo tay") thì truyền tham số category với đúng tên danh mục ở trên; query chỉ dành cho tên/dòng máy cụ thể.
- KHÔNG bịa ra sản phẩm không có trong kết quả tra cứu.
- Trả lời NGẮN GỌN, thân thiện, bằng tiếng Việt. Giá tính bằng VNĐ.
- Nếu không tìm thấy sản phẩm phù hợp, gợi ý khách thử từ khoá/khoảng giá khác.`;

    // Lịch sử từ app vẫn theo vai 'user' | 'model' (giữ nguyên hợp đồng API cũ);
    // chuẩn OpenAI gọi vai trả lời là 'assistant' nên đổi tên ở đây.
    const messages: Record<string, unknown>[] = [
      { role: 'system', content: systemInstruction },
      ...(dto.history ?? [])
        .filter((h) => h && (h.role === 'user' || h.role === 'model') && h.text)
        .map((h) => ({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.text,
        })),
      { role: 'user', content: dto.message },
    ];

    try {
      let completion = await this.createCompletion(messages);
      let products: any[] = [];

      // Vòng lặp function-calling (giới hạn để tránh lặp vô hạn).
      for (let i = 0; i < 3; i++) {
        const message = completion.choices?.[0]?.message;
        const calls = message?.tool_calls;
        if (!calls || calls.length === 0) break;

        // Phải gửi lại đúng tin nhắn assistant chứa tool_calls trước các kết quả tool.
        messages.push({
          role: 'assistant',
          content: message?.content ?? '',
          tool_calls: calls,
        });

        for (const call of calls) {
          let response: Record<string, unknown>;
          if (call.function.name === 'search_products') {
            const args = JSON.parse(call.function.arguments || '{}');
            const found = await this.searchProducts(args, categories);
            products = found;
            response = { products: found };
          } else {
            response = { error: 'Công cụ không hỗ trợ' };
          }
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(response),
          });
        }
        completion = await this.createCompletion(messages);
      }

      const reply =
        completion.choices?.[0]?.message?.content?.trim() ?? '';
      return { reply, products };
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      this.logger.error(`FPT AI lỗi (model=${this.modelName}): ${msg}`);
      // Trả message dễ hiểu thay vì 500 thô.
      throw new ServiceUnavailableException(
        `Trợ lý AI tạm thời không phản hồi được (model "${this.modelName}"). ` +
          `Kiểm tra FPT_MODEL/FPT_KEY trong .env. Chi tiết: ${msg}`,
      );
    }
  }

  private async createCompletion(
    messages: Record<string, unknown>[],
  ): Promise<FptCompletion> {
    const res = await fetch(`${FPT_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelName,
        messages,
        tools: [SEARCH_PRODUCTS_TOOL],
        stream: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    return (await res.json()) as FptCompletion;
  }

  private async searchProducts(
    args: {
      query?: string;
      category?: string;
      brand?: string;
      minPrice?: number;
      maxPrice?: number;
    },
    categories: { id: string; name: string }[],
  ) {
    // Model truyền TÊN danh mục — đổi sang id cho findAll. Tên không khớp danh mục
    // nào thì bỏ qua bộ lọc (còn query/giá) thay vì ép ra 0 kết quả.
    const categoryId = args.category
      ? categories.find((c) => c.name.toLowerCase() === args.category?.toLowerCase())?.id
      : undefined;

    const res = await this.productService.findAll({
      search: args.query,
      categoryId,
      brand: args.brand,
      minPrice: args.minPrice,
      maxPrice: args.maxPrice,
      page: 1,
      limit: 6,
    });
    // items: { id, name, brand, price, rating, primary_image, category_name, tags }
    return res.items;
  }
}
