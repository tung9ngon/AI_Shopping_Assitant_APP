# AI Shopping Assistant (NexTech) — bản di động

Kho này chia làm hai phần độc lập, mỗi phần có `package.json` riêng:

| Thư mục | Nội dung |
|---|---|
| [`mobile/`](mobile/) | App React Native 0.81 CLI — xem [mobile/README.md](mobile/README.md) |
| [`backend/`](backend/) | API NestJS 11 — xem [backend/README.md](backend/README.md) |

## Chạy

```bash
cd backend && npm install && npm run start:dev   # API, cần backend/.env

cd mobile && npm install
cp .env.example .env   # sửa API_URL thành IP máy chạy backend
npm run pods           # chỉ cần cho iOS
npm run ios            # hoặc: npm run android
```

Sửa `mobile/.env` thì phải **build lại**, reload Metro là chưa đủ —
`react-native-config` nhúng giá trị vào lúc build chứ không đọc lúc chạy.

## Ghi chú

- `backend/` là **bản sao** của `AI_Shopping_Assitant_Web/BE` lấy ngày 23/08/2026, đã bỏ
  `node_modules/`, `dist/`, `*.tsbuildinfo`. Từ đây hai bản rẽ nhánh: sửa ở kho này không
  ảnh hưởng bản web và ngược lại.
- `backend/.env` chứa khoá thật và **không** được commit (`backend/.gitignore`).
  `mobile/.env` cũng vậy vì mỗi máy một địa chỉ IP (`.gitignore` ở gốc).
- Mọi màn hình của app **đã gọi API thật**, không còn dữ liệu mẫu trong mã nguồn.
- Phiên đăng nhập đi bằng **cookie httpOnly**: backend không trả token trong body và
  `backend/src/users/auth/jwt.strategy.ts` chỉ đọc `req.cookies`, nên app không giữ
  token mà dựa vào kho cookie của hệ điều hành. Hệ quả đã biết: **đăng nhập
  Google/Facebook chưa dùng được trên app** (cookie rơi vào trình duyệt ở bước chuyển
  hướng 302); đăng nhập bằng email không dính. Chi tiết ở
  [mobile/README.md](mobile/README.md).
