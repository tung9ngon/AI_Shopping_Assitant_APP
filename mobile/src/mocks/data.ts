// Dữ liệu mẫu cho vòng dựng giao diện.
//
// Mọi đối tượng ở đây khai kiểu theo src/types (copy nguyên từ web, ánh xạ theo entity
// của backend NestJS). Nhờ vậy khi đấu API thật chỉ việc thay nguồn dữ liệu, không phải
// sửa màn hình. Giá trị decimal để dạng chuỗi cho giống hệt cách TypeORM trả về.

import type {
  Address,
  Cart,
  Category,
  DiscountCode,
  MeAccount,
  Order,
  PriceAlert,
  Product,
} from '../types';

// Trường `icon` của category chứa tên glyph Ionicons — giao diện dùng để vẽ ảnh
// đại diện khi sản phẩm chưa có ảnh thật từ Cloudinary.
export const mockCategories: Category[] = [
  { id: 'c1', name: 'Laptop', icon: 'laptop-outline', sortOrder: 1, isActive: true, createdAt: '2026-01-05T00:00:00Z' },
  { id: 'c2', name: 'Điện thoại', icon: 'phone-portrait-outline', sortOrder: 2, isActive: true, createdAt: '2026-01-05T00:00:00Z' },
  { id: 'c3', name: 'Đồng hồ thông minh', icon: 'watch-outline', sortOrder: 3, isActive: true, createdAt: '2026-01-05T00:00:00Z' },
  { id: 'c4', name: 'Tai nghe', icon: 'headset-outline', sortOrder: 4, isActive: true, createdAt: '2026-01-05T00:00:00Z' },
  { id: 'c5', name: 'Máy tính bảng', icon: 'tablet-landscape-outline', sortOrder: 5, isActive: true, createdAt: '2026-01-05T00:00:00Z' },
  { id: 'c6', name: 'Phụ kiện', icon: 'hardware-chip-outline', sortOrder: 6, isActive: true, createdAt: '2026-01-05T00:00:00Z' },
];

function spec(id: string, key: string, value: string, unit: string | null = null) {
  return { id, spec_key: key, spec_value: value, spec_unit: unit };
}

export const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'Laptop Acer Aspire 5 A515 (i5-13420H / 16GB / 512GB)',
    category_id: 'c1',
    brand: 'Acer',
    price: '15990000',
    rating: '4.6',
    description:
      'Máy mỏng nhẹ 1,78kg, màn 15.6" Full HD 100% sRGB. Cấu hình đủ cho học tập, văn phòng và các phần mềm chuyên ngành cơ bản. Pin dùng khoảng 7 tiếng công việc nhẹ.',
    is_active: true,
    created_at: '2026-07-02T08:00:00Z',
    updated_at: '2026-08-10T08:00:00Z',
    specs: [
      spec('s1', 'CPU', 'Intel Core i5-13420H'),
      spec('s2', 'RAM', '16', 'GB'),
      spec('s3', 'Ổ cứng', '512GB SSD NVMe'),
      spec('s4', 'Màn hình', '15.6" Full HD IPS'),
      spec('s5', 'Trọng lượng', '1.78', 'kg'),
    ],
    tags: [{ id: 't1', name: 'Sinh viên' }, { id: 't2', name: 'Văn phòng' }],
  },
  {
    id: 'p2',
    name: 'MacBook Air 13" M3 (8GB / 256GB)',
    category_id: 'c1',
    brand: 'Apple',
    price: '24490000',
    rating: '4.9',
    description:
      'Chip M3, máy chạy êm không quạt, pin thực tế 15-18 tiếng. Lựa chọn gọn nhẹ nhất trong tầm giá cho người mang máy đi lại nhiều.',
    is_active: true,
    created_at: '2026-06-18T08:00:00Z',
    updated_at: '2026-08-12T08:00:00Z',
    specs: [
      spec('s6', 'Chip', 'Apple M3 8 nhân'),
      spec('s7', 'RAM', '8', 'GB'),
      spec('s8', 'Ổ cứng', '256GB SSD'),
      spec('s9', 'Màn hình', '13.6" Liquid Retina'),
      spec('s10', 'Trọng lượng', '1.24', 'kg'),
    ],
    tags: [{ id: 't3', name: 'Mỏng nhẹ' }, { id: 't4', name: 'Pin trâu' }],
  },
  {
    id: 'p3',
    name: 'Laptop Gaming Lenovo LOQ 15 (i7-13650HX / RTX 4060)',
    category_id: 'c1',
    brand: 'Lenovo',
    price: '28990000',
    rating: '4.5',
    description:
      'Card RTX 4060 8GB, màn 144Hz. Chơi tốt các tựa game hiện hành ở mức cao và chạy được dựng hình, đồ hoạ 3D.',
    is_active: true,
    created_at: '2026-05-21T08:00:00Z',
    updated_at: '2026-08-01T08:00:00Z',
    specs: [
      spec('s11', 'CPU', 'Intel Core i7-13650HX'),
      spec('s12', 'Card đồ hoạ', 'NVIDIA RTX 4060 8GB'),
      spec('s13', 'RAM', '16', 'GB'),
      spec('s14', 'Màn hình', '15.6" FHD 144Hz'),
    ],
    tags: [{ id: 't5', name: 'Gaming' }, { id: 't6', name: 'Đồ hoạ' }],
  },
  {
    id: 'p4',
    name: 'Điện thoại Xiaomi Redmi Note 13 Pro (8GB / 256GB)',
    category_id: 'c2',
    brand: 'Xiaomi',
    price: '6790000',
    rating: '4.4',
    description:
      'Camera chính 200MP, màn AMOLED 120Hz, pin 5100mAh sạc nhanh 67W. Mức giá dưới 7 triệu nhưng cấu hình thuộc nhóm tốt nhất phân khúc.',
    is_active: true,
    created_at: '2026-07-15T08:00:00Z',
    updated_at: '2026-08-15T08:00:00Z',
    specs: [
      spec('s15', 'Màn hình', '6.67" AMOLED 120Hz'),
      spec('s16', 'Camera sau', '200', 'MP'),
      spec('s17', 'Pin', '5100', 'mAh'),
      spec('s18', 'Bộ nhớ', '8GB / 256GB'),
    ],
    tags: [{ id: 't7', name: 'Giá tốt' }, { id: 't8', name: 'Chụp ảnh' }],
  },
  {
    id: 'p5',
    name: 'iPhone 15 128GB',
    category_id: 'c2',
    brand: 'Apple',
    price: '19990000',
    rating: '4.8',
    description:
      'Chip A16 Bionic, cổng USB-C, camera 48MP có chế độ chân dung tự động. Máy chính hãng VN/A, bảo hành 12 tháng.',
    is_active: true,
    created_at: '2026-04-09T08:00:00Z',
    updated_at: '2026-08-18T08:00:00Z',
    specs: [
      spec('s19', 'Chip', 'Apple A16 Bionic'),
      spec('s20', 'Màn hình', '6.1" Super Retina XDR'),
      spec('s21', 'Camera sau', '48', 'MP'),
      spec('s22', 'Bộ nhớ', '128GB'),
    ],
    tags: [{ id: 't9', name: 'Bán chạy' }],
  },
  {
    id: 'p6',
    name: 'Samsung Galaxy A55 5G (8GB / 256GB)',
    category_id: 'c2',
    brand: 'Samsung',
    price: '8990000',
    rating: '4.3',
    description:
      'Khung kim loại, kháng nước IP67, cam kết 4 đời Android. Lựa chọn bền cho người dùng lâu dài.',
    is_active: true,
    created_at: '2026-06-30T08:00:00Z',
    updated_at: '2026-08-11T08:00:00Z',
    specs: [
      spec('s23', 'Màn hình', '6.6" Super AMOLED 120Hz'),
      spec('s24', 'Chống nước', 'IP67'),
      spec('s25', 'Pin', '5000', 'mAh'),
    ],
    tags: [{ id: 't10', name: 'Bền bỉ' }],
  },
  {
    id: 'p7',
    name: 'Apple Watch Series 9 GPS 41mm',
    category_id: 'c3',
    brand: 'Apple',
    price: '9490000',
    rating: '4.7',
    description:
      'Đo nhịp tim, điện tâm đồ, nồng độ oxy máu. Thao tác chạm hai ngón mới, màn hình sáng tới 2000 nits.',
    is_active: true,
    created_at: '2026-03-12T08:00:00Z',
    updated_at: '2026-08-05T08:00:00Z',
    specs: [
      spec('s26', 'Kích thước', '41', 'mm'),
      spec('s27', 'Chống nước', '50m'),
      spec('s28', 'Pin', '18', 'giờ'),
    ],
    tags: [{ id: 't11', name: 'Sức khoẻ' }],
  },
  {
    id: 'p8',
    name: 'Xiaomi Smart Band 8 Pro',
    category_id: 'c3',
    brand: 'Xiaomi',
    price: '1290000',
    rating: '4.2',
    description:
      'Màn AMOLED 1.74", pin 14 ngày, hơn 150 chế độ luyện tập. Vòng đeo đáng tiền nhất tầm dưới 1,5 triệu.',
    is_active: true,
    created_at: '2026-07-20T08:00:00Z',
    updated_at: '2026-08-14T08:00:00Z',
    specs: [
      spec('s29', 'Màn hình', '1.74" AMOLED'),
      spec('s30', 'Pin', '14', 'ngày'),
    ],
    tags: [{ id: 't12', name: 'Giá tốt' }],
  },
  {
    id: 'p9',
    name: 'Tai nghe Sony WH-1000XM5',
    category_id: 'c4',
    brand: 'Sony',
    price: '7990000',
    rating: '4.9',
    description:
      'Chống ồn chủ động thuộc nhóm tốt nhất thị trường, pin 30 giờ, gập gọn mang đi. Phù hợp đi máy bay và làm việc nơi ồn.',
    is_active: true,
    created_at: '2026-02-25T08:00:00Z',
    updated_at: '2026-08-09T08:00:00Z',
    specs: [
      spec('s31', 'Chống ồn', 'ANC chủ động'),
      spec('s32', 'Pin', '30', 'giờ'),
      spec('s33', 'Kết nối', 'Bluetooth 5.2'),
    ],
    tags: [{ id: 't13', name: 'Chống ồn' }, { id: 't14', name: 'Cao cấp' }],
  },
  {
    id: 'p10',
    name: 'AirPods Pro 2 (USB-C)',
    category_id: 'c4',
    brand: 'Apple',
    price: '5290000',
    rating: '4.8',
    description:
      'Chống ồn gấp đôi đời trước, chế độ Xuyên âm thích ứng, hộp sạc USB-C có loa định vị.',
    is_active: true,
    created_at: '2026-05-02T08:00:00Z',
    updated_at: '2026-08-16T08:00:00Z',
    specs: [
      spec('s34', 'Chip', 'Apple H2'),
      spec('s35', 'Pin', '6', 'giờ'),
    ],
    tags: [{ id: 't15', name: 'Bán chạy' }],
  },
  {
    id: 'p11',
    name: 'iPad Gen 10 WiFi 64GB',
    category_id: 'c5',
    brand: 'Apple',
    price: '9990000',
    rating: '4.6',
    description:
      'Màn 10.9" viền mỏng, chip A14, hỗ trợ Apple Pencil 1. Dùng tốt cho ghi chép và học trực tuyến.',
    is_active: true,
    created_at: '2026-04-28T08:00:00Z',
    updated_at: '2026-08-03T08:00:00Z',
    specs: [
      spec('s36', 'Màn hình', '10.9" Liquid Retina'),
      spec('s37', 'Chip', 'Apple A14 Bionic'),
      spec('s38', 'Bộ nhớ', '64GB'),
    ],
    tags: [{ id: 't16', name: 'Học tập' }],
  },
  {
    id: 'p12',
    name: 'Sạc dự phòng Anker 737 PowerCore 24.000mAh',
    category_id: 'c6',
    brand: 'Anker',
    price: '2790000',
    rating: '4.5',
    description:
      'Công suất 140W, sạc được cả laptop. Có màn hình hiển thị thông số thực tế.',
    is_active: true,
    created_at: '2026-06-11T08:00:00Z',
    updated_at: '2026-08-07T08:00:00Z',
    specs: [
      spec('s39', 'Dung lượng', '24000', 'mAh'),
      spec('s40', 'Công suất', '140', 'W'),
    ],
    tags: [{ id: 't17', name: 'Phụ kiện' }],
  },
];

// Gắn quan hệ category vào từng sản phẩm, giống cách backend trả về khi có `relations`.
mockProducts.forEach((p) => {
  p.category = mockCategories.find((c) => c.id === p.category_id) ?? null;
});

// Giỏ hàng backend trả về (CartItemProduct) chỉ có id/tên/giá/ảnh, không kèm danh mục.
// Khi chưa có ảnh thật từ Cloudinary, tra ngược danh mục theo id để ảnh thay thế vẽ đúng
// loại hàng thay vì icon chung.
export function productIcon(productId: string): string | null {
  return mockProducts.find((p) => p.id === productId)?.category?.icon ?? null;
}

export const mockBrands = ['Apple', 'Samsung', 'Xiaomi', 'Lenovo', 'Acer', 'Sony', 'Anker'];

// Sản phẩm đang giảm giá — dùng cho khối "Deal hot hôm nay" ở trang chủ.
// `originalPrice` không có trong entity backend; đây là dữ liệu trình bày của màn hình.
export const mockDeals: { product: Product; originalPrice: number }[] = [
  { product: mockProducts[3], originalPrice: 7990000 },
  { product: mockProducts[8], originalPrice: 9490000 },
  { product: mockProducts[7], originalPrice: 1690000 },
  { product: mockProducts[0], originalPrice: 17990000 },
];

export const mockCart: Cart = {
  id: 'cart-1',
  items: [
    {
      id: 'ci1',
      quantity: 1,
      product: { id: 'p5', name: mockProducts[4].name, price: '19990000', image: null },
    },
    {
      id: 'ci2',
      quantity: 2,
      product: { id: 'p10', name: mockProducts[9].name, price: '5290000', image: null },
    },
  ],
  subtotal: 19990000 + 5290000 * 2,
};

export const mockAddresses: Address[] = [
  {
    id: 'a1',
    full_address: '25 Ngõ 84 Chùa Láng, P. Láng Thượng, Q. Đống Đa, Hà Nội',
    recipient_name: 'Nguyễn Thanh Tùng',
    phone_number: '0912345678',
    is_default: true,
  },
  {
    id: 'a2',
    full_address: 'Toà A2 Vinhomes Gardenia, P. Cầu Diễn, Q. Nam Từ Liêm, Hà Nội',
    recipient_name: 'Nguyễn Thanh Tùng',
    phone_number: '0987654321',
    is_default: false,
  },
];

export const mockVouchers: DiscountCode[] = [
  {
    id: 'v1',
    code: 'NEXTECH10',
    description: 'Giảm 10% tối đa 500.000đ cho đơn từ 2 triệu',
    category: 'order',
    discount_type: 'percent',
    discount_value: 10,
    min_order_value: 2000000,
    max_discount: 500000,
    usage_limit: 200,
    used_count: 47,
    valid_from: '2026-08-01T00:00:00Z',
    valid_until: '2026-09-30T23:59:59Z',
    is_active: true,
    status: 'running',
  },
  {
    id: 'v2',
    code: 'GIAM200K',
    description: 'Giảm thẳng 200.000đ cho đơn từ 5 triệu',
    category: 'order',
    discount_type: 'fixed_amount',
    discount_value: 200000,
    min_order_value: 5000000,
    max_discount: null,
    usage_limit: 100,
    used_count: 88,
    valid_from: '2026-08-10T00:00:00Z',
    valid_until: '2026-08-31T23:59:59Z',
    is_active: true,
    status: 'running',
  },
  {
    id: 'v3',
    code: 'FREESHIP',
    description: 'Miễn phí vận chuyển, không yêu cầu giá trị tối thiểu',
    category: 'free_shipping',
    discount_type: 'fixed_amount',
    discount_value: 30000,
    min_order_value: null,
    max_discount: null,
    usage_limit: null,
    valid_from: '2026-08-01T00:00:00Z',
    valid_until: '2026-12-31T23:59:59Z',
    is_active: true,
    status: 'running',
  },
  {
    id: 'v4',
    code: 'FREESHIPXTRA',
    description: 'Miễn phí vận chuyển cho đơn từ 10 triệu',
    category: 'free_shipping',
    discount_type: 'fixed_amount',
    discount_value: 30000,
    min_order_value: 10000000,
    max_discount: null,
    usage_limit: 50,
    used_count: 12,
    valid_from: '2026-08-01T00:00:00Z',
    valid_until: '2026-09-15T23:59:59Z',
    is_active: true,
    status: 'running',
  },
];

export const mockOrders: Order[] = [
  {
    id: 'ORD-20260818-0031',
    user_id: 'u1',
    cart_id: null,
    discount_code_id: 'v1',
    subtotal: 24490000,
    shipping_fee: 0,
    discount_amount: 500000,
    total: 23990000,
    status: 'shipped',
    note: 'Giao giờ hành chính',
    created_at: '2026-08-18T09:24:00Z',
    updated_at: '2026-08-20T14:02:00Z',
    items: [
      { id: 'oi1', product_id: 'p2', quantity: 1, unit_price: 24490000, product: mockProducts[1] },
    ],
    payment: {
      id: 'pay1',
      order_id: 'ORD-20260818-0031',
      method: 'payos',
      status: 'success',
      amount: 23990000,
      created_at: '2026-08-18T09:25:00Z',
      updated_at: '2026-08-18T09:31:00Z',
    },
  },
  {
    id: 'ORD-20260815-0018',
    user_id: 'u1',
    cart_id: null,
    discount_code_id: null,
    subtotal: 7990000,
    shipping_fee: 0,
    discount_amount: 0,
    total: 7990000,
    status: 'paid',
    note: null,
    created_at: '2026-08-15T20:11:00Z',
    updated_at: '2026-08-16T08:40:00Z',
    items: [
      { id: 'oi2', product_id: 'p9', quantity: 1, unit_price: 7990000, product: mockProducts[8] },
    ],
    payment: {
      id: 'pay2',
      order_id: 'ORD-20260815-0018',
      method: 'payos',
      status: 'success',
      amount: 7990000,
      created_at: '2026-08-15T20:12:00Z',
      updated_at: '2026-08-15T20:14:00Z',
    },
  },
  {
    id: 'ORD-20260821-0044',
    user_id: 'u1',
    cart_id: null,
    discount_code_id: null,
    subtotal: 1290000,
    shipping_fee: 30000,
    discount_amount: 0,
    total: 1320000,
    status: 'pending',
    note: null,
    created_at: '2026-08-21T16:48:00Z',
    updated_at: '2026-08-21T16:48:00Z',
    items: [
      { id: 'oi3', product_id: 'p8', quantity: 1, unit_price: 1290000, product: mockProducts[7] },
    ],
    payment: {
      id: 'pay3',
      order_id: 'ORD-20260821-0044',
      method: 'cod',
      status: 'pending',
      amount: 1320000,
      created_at: '2026-08-21T16:48:00Z',
      updated_at: '2026-08-21T16:48:00Z',
    },
  },
  {
    id: 'ORD-20260710-0007',
    user_id: 'u1',
    cart_id: null,
    discount_code_id: null,
    subtotal: 2790000,
    shipping_fee: 30000,
    discount_amount: 0,
    total: 2820000,
    status: 'cancelled',
    note: 'Đặt nhầm số lượng',
    created_at: '2026-07-10T11:03:00Z',
    updated_at: '2026-07-10T11:20:00Z',
    items: [
      { id: 'oi4', product_id: 'p12', quantity: 1, unit_price: 2790000, product: mockProducts[11] },
    ],
  },
];

export const mockPriceAlerts: PriceAlert[] = [
  {
    id: 'pa1',
    product_id: 'p3',
    target_price: 26000000,
    notify_channel: 'app',
    is_active: true,
    created_at: '2026-08-12T10:00:00Z',
    product: mockProducts[2],
  },
  {
    id: 'pa2',
    product_id: 'p5',
    target_price: 18500000,
    notify_channel: 'app',
    is_active: false,
    created_at: '2026-07-28T10:00:00Z',
    product: mockProducts[4],
  },
];

export const mockAccount: MeAccount = {
  id: 'u1',
  full_name: 'Nguyễn Thanh Tùng',
  email: 'trinam.teamb05@gmail.com',
  phone_number: '0912345678',
  avatar_url: null,
  role: 'user',
  is_active: true,
  created_at: '2026-02-14T03:12:00Z',
};

// ---- Hội thoại mẫu với trợ lý AI ----
// Mô phỏng đúng luồng UC-AI-01: người dùng nêu nhu cầu → Gemini gọi công cụ
// `search_products` → trả lời kèm tối đa 6 sản phẩm bấm được.
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: Product[];
  created_at: string;
}

export const mockChatHistory: ChatMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    content:
      'Chào bạn! Mình là trợ lý mua sắm của NexTech. Bạn cứ nói nhu cầu bằng lời thường thôi — ví dụ "laptop cho sinh viên dưới 20 triệu" — mình sẽ tra kho hàng thật rồi tư vấn.',
    created_at: '2026-08-21T14:02:00Z',
  },
  {
    id: 'm2',
    role: 'user',
    content: 'mình cần laptop cho sinh viên, ngân sách khoảng 16 triệu',
    created_at: '2026-08-21T14:02:30Z',
  },
  {
    id: 'm3',
    role: 'assistant',
    content:
      'Trong tầm 16 triệu, mình thấy Acer Aspire 5 A515 là hợp nhất: i5-13420H với 16GB RAM là dư dùng cho hầu hết phần mềm học tập, máy 1,78kg mang đi lại vẫn ổn.\n\nNếu bạn ưu tiên pin và độ gọn hơn cấu hình, MacBook Air M3 vượt ngân sách một chút nhưng pin gần gấp đôi.',
    products: [mockProducts[0], mockProducts[1]],
    created_at: '2026-08-21T14:02:38Z',
  },
];

// Gợi ý câu hỏi cho màn hình chat khi chưa có hội thoại nào.
export const mockChatSuggestions = [
  'Laptop cho sinh viên dưới 20 triệu',
  'Điện thoại chụp ảnh đẹp dưới 10 triệu',
  'Tai nghe chống ồn đi máy bay',
  'Đồng hồ theo dõi sức khoẻ giá rẻ',
];

// ---- Quy tắc nghiệp vụ, trích từ BE/src/users/order/order.service.ts ----
export const SHIPPING_FEE = 30000;
export const FREE_SHIPPING_THRESHOLD = 500000;
