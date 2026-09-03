# NexTech Backend — API NestJS

API cho **AI Shopping Assistant (NexTech)**: bán hàng điện tử kèm trợ lý tư vấn.
Dùng chung cho cả bản web và bản di động trong kho này (`../mobile`).

Nền tảng: **NestJS 11**, TypeScript, **TypeORM + PostgreSQL**, Redis (`ioredis`).
Bên ngoài: **Gemini** (`@google/generative-ai`) cho trợ lý, **PayOS** (`@payos/node`)
cho thanh toán, **Cloudinary** cho ảnh sản phẩm, **nodemailer** cho thư OTP.

## Chạy

```bash
npm install
npm run start:dev     # nest start --watch
```

Cần một file `.env` đặt ngay trong `backend/` — file này **không được commit**
(`.gitignore`). Kho chưa có `.env.example`; danh sách biến ở mục dưới.

Máy chủ chạy ở cổng `PORT` và mọi route đều có tiền tố `/api`
(`app.setGlobalPrefix('api')` trong `src/main.ts`).

## Biến môi trường

Khai trong `src/config/configuration.ts`, trừ nhóm Cloudinary đọc thẳng từ `.env`.

| Nhóm | Biến |
|---|---|
| Máy chủ | `PORT`, `NODE_ENV`, `REDIRECT_URI` (địa chỉ web để chuyển hướng sau OAuth) |
| PostgreSQL | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` |
| JWT | `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS` |
| Thư (OTP) | `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |
| Facebook OAuth | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_CALLBACK_URL` |
| PayOS | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` |
| Gemini | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |

## Cấu trúc

```
src/
  main.ts       Khai AppModule + bootstrap (cookie-parser, ValidationPipe, CORS, prefix)
  config/       configuration.ts (đọc .env), redis.ts
  database/     Entity TypeORM
  users/        Nghiệp vụ phía người mua — mỗi thư mục một module
  admin/        Nghiệp vụ phía quản trị
  cloudinary/   Provider tải ảnh
```

## Nhóm endpoint

Tất cả nằm dưới `/api`.

| Phía | Route |
|---|---|
| Người mua | `auth`, `categories`, `products`, `cart`, `orders`, `payments`, `discount-codes`, `price-alerts`, `chat`, `conversations`, `users/me`, `users/me/addresses` |
| Quản trị | `admin/categories`, `admin/products`, `admin/orders`, `admin/payments`, `admin/discount-codes`, `admin/conversations`, `admin/users`, `admin/statistics` |
| Khác | `webhooks/payos` |

## Ghi chú kỹ thuật

- **Đăng nhập trả cookie httpOnly, không trả token trong body.** `jwt.strategy.ts` chỉ
  đọc `req.cookies.access_token` / `refresh_token`. Client nào không giữ được cookie thì
  không gọi được API.
- **OAuth trên mobile đi bằng mã một lần.** App gọi `GET /auth/<provider>?platform=mobile`;
  callback thấy `state=mobile` thì không đặt cookie mà phát mã một lần (Redis, TTL 60 giây)
  rồi redirect về deep link `nextech://oauth?code=...`; app đổi mã lấy cookie phiên qua
  `POST /auth/oauth/exchange` (xem `../mobile/README.md`).
- **`JwtAccessGuard` tự làm mới token ngầm** bằng `refresh_token` trước khi trả 401, nên
  client không cần tự gọi `/auth/refresh`.
- **`synchronize: true`** trong `main.ts`: TypeORM tự đổi cấu trúc bảng theo entity mỗi
  lần khởi động. Tiện lúc làm, nhưng chạy thật thì phải tắt và chuyển sang migration —
  nếu không, sửa nhầm một entity là mất dữ liệu.
- **CORS chỉ mở cho `http://localhost:3000`** (bản web chạy máy cục bộ). Bản di động
  không bị chặn vì React Native không áp CORS. Đưa web lên máy chủ thật thì phải sửa.
- **`ValidationPipe` bật `forbidNonWhitelisted`**: gửi thừa một trường không khai trong
  DTO là bị trả 400, không phải bị bỏ qua.
- **Cảnh báo giá chạy bằng cron 30 giây một lượt** (`@Cron('*/30 * * * * *')` trong
  `users/pricealert/pricealert.service.ts`), cần `ScheduleModule.forRoot()` ở `main.ts`.
