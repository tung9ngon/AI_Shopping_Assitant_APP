# AI Shopping Assistant (NexTech) — bản di động

Kho này chia làm hai phần độc lập, mỗi phần có `package.json` riêng:

| Thư mục | Nội dung |
|---|---|
| [`mobile/`](mobile/) | App React Native, Expo SDK 54 — xem [mobile/README.md](mobile/README.md) |
| [`backend/`](backend/) | API NestJS 11 — xem [backend/README.md](backend/README.md) |

## Chạy

```bash
cd backend && npm install && npm run start:dev   # API (cần backend/.env)
cd mobile  && npm install && npm start           # Expo
```

## Ghi chú

- `backend/` là **bản sao** của `AI_Shopping_Assitant_Web/BE` lấy ngày 23/08/2026, đã bỏ
  `node_modules/`, `dist/`, `*.tsbuildinfo`. Từ đây hai bản rẽ nhánh: sửa ở kho này không
  ảnh hưởng bản web và ngược lại.
- `backend/.env` chứa khoá thật và **không** được commit (`backend/.gitignore`).
- App di động chưa đấu API thật — dữ liệu vẫn lấy từ `mobile/src/mocks/data.ts`.
  Tồn đọng cần xử lý trước khi đấu: BE mới đọc JWT từ cookie, phải cho nhận header
  `Authorization: Bearer` (`backend/src/users/auth/jwt.strategy.ts`).
