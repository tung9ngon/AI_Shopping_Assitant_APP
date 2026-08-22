# NexTech Mobile — ứng dụng di động React Native

Bản di động của **AI Shopping Assistant (NexTech)**, dựng theo tài liệu
`docs/GIOI-THIEU-DU-AN-MOBILE.md`. Vòng này **chỉ làm giao diện**, dữ liệu lấy từ
`src/mocks/data.ts` — chưa gọi backend.

## Chạy thử

```bash
cd Mobile_new
npm install
npm start          # quét mã QR bằng Expo Go trên điện thoại
npm run web        # hoặc xem nhanh trong trình duyệt
```

Nền tảng: **Expo SDK 54** (React Native 0.81, React 19.1), **React Navigation 7**,
TypeScript. Không cần Xcode / Android Studio để xem thử.

## Đã có gì

| Nhóm | Màn hình | Use case |
|---|---|---|
| Khám phá | Trang chủ, Tìm/lọc sản phẩm, Chi tiết sản phẩm | UC-PROD-01→03 |
| Trợ lý AI | Chat toàn màn hình, lịch sử hội thoại | UC-AI-01, UC-AI-02 |
| Mua hàng | Giỏ hàng, Đặt hàng, Chọn mã giảm giá, Đặt hàng thành công | UC-CART-02, UC-ORDER-01/02, UC-PAY-01/02 |
| Sau bán | Đơn hàng của tôi, Chi tiết đơn, Theo dõi giá | UC-ORDER-03/04/05, UC-ALERT-01/02 |
| Tài khoản | Đăng nhập (email + Google/Facebook), Đăng ký 3 bước có OTP, Tài khoản | UC-AUTH-01→05 |

Trợ lý AI ở tab giữa, vẽ nhô lên — theo mục 3.1.b của tài liệu, trò chuyện là giao diện
chính của sản phẩm chứ không phải widget góc màn hình như bản web.

## Cấu trúc

```
src/
  theme/       Design token — lấy nhận diện từ bản web (#f26d21, radius 8)
  types/       COPY NGUYÊN từ FE/src/types/index.ts — không sửa một dòng
  utils/       COPY NGUYÊN từ FE/src/utils/format.ts
  mocks/       Dữ liệu mẫu, khai kiểu theo src/types
  components/  Component nền dùng lại (nút, thẻ, ô nhập, ảnh sản phẩm…)
  context/     Giỏ hàng, phiên đăng nhập
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
- Mã OTP hiệu lực **5 phút**.
- Trợ lý AI trả tối đa **6 sản phẩm** mỗi lượt, tin nhắn tối đa **2.000 ký tự**.

## Chưa làm (vòng sau)

- **Đấu API thật.** Backend hiện chỉ đọc JWT từ cookie
  (`BE/src/users/auth/jwt.strategy.ts`), app không có trình duyệt nên phải mở rộng BE
  nhận header `Authorization: Bearer` trước — mục 3.4 và tồn đọng #1 của tài liệu.
- **Ảnh sản phẩm thật.** Đang vẽ ảnh thay thế theo danh mục; truyền `uri` vào
  `ProductThumb` là tự chuyển sang ảnh Cloudinary.
- Sổ địa chỉ, Hồ sơ cá nhân, Sở thích mua sắm (đã đánh dấu "Vòng sau" trong app).
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
