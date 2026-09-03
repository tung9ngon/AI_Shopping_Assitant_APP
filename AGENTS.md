# Nền tảng của kho này

`mobile/` là **React Native 0.81.5 CLI**, không phải Expo. Thư mục `ios/` và `android/`
là mã nguồn có commit, không sinh lại được bằng `expo prebuild`; `npm start` chạy Metro
của React Native CLI chứ không phải Expo Dev Server. Tài liệu đúng phiên bản:
https://reactnative.dev/docs/0.81/getting-started

`backend/` là **NestJS 11** + TypeORM + PostgreSQL: https://docs.nestjs.com

Thêm thư viện có phần native thì phải chạy lại `npm run pods` (xem `mobile/README.md`).
