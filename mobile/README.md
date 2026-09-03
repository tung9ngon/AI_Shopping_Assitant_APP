# NexTech Mobile — ứng dụng di động React Native

Bản di động của **AI Shopping Assistant (NexTech)**, dựng theo tài liệu
`docs/GIOI-THIEU-DU-AN-MOBILE.md`.

Mọi màn hình đều gọi backend thật — không còn dữ liệu mẫu trong mã nguồn. Bảng
"Đã đấu API tới đâu" bên dưới liệt kê từng nhóm endpoint.

## Chạy thử

Cần sẵn **Xcode** và **CocoaPods** (`brew install cocoapods`) — đây là bản React Native
CLI, không còn chạy được bằng Expo Go.

```bash
cd mobile
npm install
cp .env.example .env   # rồi sửa API_URL thành IP máy chạy backend
npm run pods           # cd ios && pod install
npm run ios            # hoặc: npm start  rồi mở Xcode bấm Run
```

Chạy Android thì không cần CocoaPods, chỉ cần Android Studio / SDK:

```bash
npm run android
```

Backend phải chạy sẵn (`cd backend && npm run start:dev`, cổng 8000).

Sửa `.env` thì phải **build lại** (`npm run ios`) — `react-native-config` nhúng giá trị
vào lúc build chứ không đọc lúc chạy, reload Metro là chưa đủ.

Nền tảng: **React Native 0.81 CLI** (React 19.1), **React Navigation 7**, TypeScript.
Icon dùng `@react-native-vector-icons/ionicons` (bản `/static` — font `Ionicons.ttf` do
CocoaPods chép vào app, khai ở `UIAppFonts` trong `ios/NexTech/Info.plist`). Mã QR PayOS
vẽ bằng `react-native-qrcode-svg` (+ `react-native-svg`).

Thư mục `ios/` và `android/` là **mã nguồn**, có commit. Thêm thư viện native mới thì
chạy lại `npm run pods`.

## Đã có gì

| Nhóm | Màn hình | Use case |
|---|---|---|
| Khám phá | Trang chủ, Tìm/lọc sản phẩm, Chi tiết sản phẩm | UC-PROD-01→03 |
| Trợ lý AI | Chat toàn màn hình, lịch sử hội thoại | UC-AI-01, UC-AI-02 |
| Mua hàng | Giỏ hàng, Đặt hàng, Chọn mã giảm giá, Thanh toán PayOS (QR + chờ xác nhận), Kết quả thanh toán, Đặt hàng thành công | UC-CART-02, UC-ORDER-01/02, UC-PAY-01/02 |
| Sau bán | Đơn hàng của tôi, Chi tiết đơn, Theo dõi giá | UC-ORDER-03/04/05, UC-ALERT-01/02 |
| Tài khoản | Đăng nhập (email + Google/Facebook), Đăng ký 3 bước có OTP, Quên mật khẩu 3 bước, Tài khoản | UC-AUTH-01→05 |
| Dữ liệu cá nhân | Sổ địa chỉ, Thêm/sửa địa chỉ, Hồ sơ cá nhân, Sở thích mua sắm | *(chưa đối chiếu mã UC)* |
| Đánh giá | Danh sách đánh giá sản phẩm, Viết đánh giá | *(chưa đối chiếu mã UC)* |

Trợ lý AI ở tab giữa, vẽ nhô lên — theo mục 3.1.b của tài liệu, trò chuyện là giao diện
chính của sản phẩm chứ không phải widget góc màn hình như bản web.

## Cấu trúc

```
src/
  theme/       Design token — lấy nhận diện từ bản web (#f26d21, radius 8)
  types/       COPY NGUYÊN từ FE/src/types/index.ts — không sửa một dòng
  utils/       COPY NGUYÊN từ FE/src/utils/format.ts
  constants.ts Hằng số nghiệp vụ chép theo backend (phí ship, ngưỡng miễn phí ship)
  components/  Component nền dùng lại (nút, thẻ, ô nhập, ảnh sản phẩm…)
  api/         Lớp gọi backend: client dùng chung + từng nhóm endpoint
  hooks/       useApi — nạp dữ liệu kèm trạng thái đang tải / lỗi / tải lại
  context/     Giỏ hàng, phiên đăng nhập, dữ liệu tài khoản (sổ địa chỉ, sở thích)
  navigation/  Tab + Stack, thay cho bảng route React Router của web
  screens/     Các màn hình, gom theo nghiệp vụ giống FE/src/pages/
```

`types/` và `utils/format.ts` là **bản sao nguyên văn** của bản web — đúng phần
"tái sử dụng 100%" ở mục 3.3 tài liệu. Cần sửa thì sửa ở FE rồi chép lại,
để hai bản không lệch nhau.

## Quy tắc nghiệp vụ đã cài trong giao diện

Trích từ `BE/src/users/order/order.service.ts` và các ràng buộc backend:

- Phí ship **30.000đ**, miễn phí khi tạm tính từ **500.000đ**.
- Một đơn áp tối đa **2 mã**: 1 mã giảm tiền hàng + 1 mã miễn phí ship.
- Chỉ huỷ được đơn ở trạng thái `pending` / `simulated_success`.
- Mã OTP hiệu lực **5 phút**, chặn gửi lại trong **60 giây** đầu.
- Mật khẩu tối thiểu **8 ký tự**, có ít nhất **1 chữ hoa và 1 chữ số** (`PASSWORD_REGEX` trong `BE/src/users/auth/auth.dto.ts`).
- Số điện thoại khớp `/^[0-9+ ]{8,15}$/`, địa chỉ tối đa **255 ký tự**.
- Trợ lý AI trả tối đa **6 sản phẩm** mỗi lượt, tin nhắn tối đa **2.000 ký tự**.
- Chỉ đánh giá được sản phẩm nằm trong đơn **đã hoàn tất** (`status = 'paid'`), **mỗi người một đánh giá** cho một sản phẩm; điểm **1–5**, tiêu đề ≤ 255, nội dung ≤ 2.000 ký tự.
- Thanh toán PayOS chỉ coi là thành công khi **backend xác nhận** (`GET /api/payments/:id/status`) — không suy ra từ thao tác của người dùng.
- Hội thoại với trợ lý AI **lưu trên máy chủ**: máy chủ tự dựng ngữ cảnh từ **20 tin gần
  nhất** của phiên, app không gửi lại lịch sử. Tiêu đề phiên lấy từ câu hỏi đầu tiên.
- Hỏi lúc **chưa đăng nhập** vẫn được: backend cấp cookie httpOnly `guest_id` cho thiết
  bị, và **chỉ thiết bị đó** đọc/ghi được phiên (biết id thôi không đủ). Đăng nhập xong
  app gọi `POST /conversations/claim` để kéo các phiên đó về tài khoản.

## Đã đấu API tới đâu

| Cụm | Trạng thái | Endpoint |
|---|---|---|
| Đăng nhập / Đăng ký / Quên mật khẩu | **Thật** | `/auth/login`, `send-otp`, `verify-otp`, `register`, `forgot-password`, `verify-reset-otp`, `reset-password`, `logout`, `/users/me` |
| Trang chủ | **Thật** | `/categories`, `/products`, `/products/brands` |
| Tìm / lọc sản phẩm | **Thật** | `/products` (lọc & sắp xếp do backend làm) |
| Chi tiết sản phẩm | **Thật** | `/products/:id` |
| Giỏ hàng | **Thật** | `/cart`, `/cart/items` |
| Đánh giá sản phẩm | **Thật** | `/products/:id/reviews` (GET, POST) |
| Đặt hàng / Đơn hàng | **Thật** | `/orders` (POST, GET), `/orders/:id`, `/orders/:id/cancel` |
| Mã giảm giá | **Thật** | `/discount-codes`, `/discount-codes/freeship` |
| Thanh toán | **Thật** | `/payments`, `/payments/:id/status` |
| Sổ địa chỉ | **Thật** | `/users/me/addresses` (+ `:id`, `:id/default`) |
| Hồ sơ / Sở thích | **Thật** | `/users/me`, `/users/me/profile`, `/users/me/preferences` |
| Theo dõi giá | **Thật** | `/price-alerts` (GET, POST, DELETE) |
| Trợ lý AI + lịch sử hội thoại | **Thật** | `/conversations`, `/conversations/:id/messages` (Gemini, có lưu) |

**Phiên đăng nhập đi bằng cookie.** Backend chỉ đặt `access_token` / `refresh_token` vào
cookie httpOnly và không trả token trong body, nên app không giữ token — React Native
gửi lại cookie bằng kho cookie của hệ điều hành. Tài liệu React Native có cảnh báo
"cookie based authentication is currently unstable"; lỗi đã biết nằm ở luồng chuyển
hướng 302, nên đăng nhập Google/Facebook không đi qua redirect: app mở trình duyệt hệ
thống tới `GET /auth/<provider>?platform=mobile`, backend đưa kết quả về deep link
`nextech://oauth?code=...`, rồi app đổi mã lấy cookie bằng `POST /auth/oauth/exchange`
(một response POST trực tiếp, không dính lỗi 302).

Không cần tự gọi `/auth/refresh` khi gặp 401: `JwtAccessGuard` của backend đã tự làm mới
ngầm bằng `refresh_token` rồi mới trả lỗi.

## Chưa làm (vòng sau)

- **Thông báo đẩy.** Backend không có controller cho bảng `notifications`.
- **Ảnh sản phẩm.** Dùng ảnh Cloudinary thật (`primary_image` / `images[]`); sản phẩm
  chưa có ảnh thì vẽ ảnh thay thế theo danh mục.
- **"Deal hot hôm nay" ở trang chủ đã bỏ.** Backend không lưu giá gốc/khuyến mãi nên
  không có nguồn cho giá gạch ngang; thay bằng dải "Đánh giá cao nhất"
  (`/products?sort=rating_desc`).
- **Giá lúc đặt hàng.** `GET /api/orders/:id` trả giá HIỆN TẠI của sản phẩm chứ không
  phải giá lúc đặt (bảng `order_items` không lưu `unit_price`), nên sản phẩm đổi giá thì
  tổng các dòng trong màn Chi tiết đơn không khớp `subtotal`. Phải sửa ở backend.
- **Thông tin thanh toán trong chi tiết đơn.** `GET /api/orders/:id` không trả kèm giao
  dịch, nên màn Chi tiết đơn không hiện được hình thức / trạng thái thanh toán.
- **Ảnh đại diện.** Màn Hồ sơ cá nhân chưa cho đổi ảnh — chọn ảnh từ máy cần thêm
  `react-native-image-picker`, để chung vòng làm camera (UC-MOB-04).
- Nhóm I — chức năng đặc thù di động: thông báo đẩy, deep link ngân hàng, sinh trắc học,
  camera, xem offline (UC-MOB-01→06).
- Khu quản trị (nhóm H).

## Ghi chú kỹ thuật

- **Chiều cao thanh tab** khai ở `src/theme/index.ts` (`tabBarHeight`) và dùng chung cho
  cả navigator lẫn phần chừa cuối trang của các màn hình trong tab. Đừng để nhỏ hơn
  ~76: React Navigation chia chiều cao còn lại cho từng ô rồi cho nhãn `flexShrink`,
  thiếu chỗ là nhãn bị bóp và **cắt mất chân dấu tiếng Việt**.
- Cùng lý do, đặt `lineHeight` cho chữ tiếng Việt ở mức **≥ 1.4 lần cỡ chữ** — dấu nằm
  cả trên lẫn dưới nên tốn chỗ hơn tiếng Anh.
