# Build app lên máy Android cắm USB vào Mac

Hướng dẫn viết theo đúng cấu hình đang có trên máy này (macOS arm64, không cài
Android Studio — chỉ có SDK command-line tools từ Homebrew).

Nền tảng: React Native 0.81.5 **CLI** (không phải Expo). Thư mục `android/` là mã
nguồn có commit, không sinh lại được.

---

## 0. Bảng tra nhanh

| Thứ | Giá trị trên máy này |
|---|---|
| JDK | `openjdk@17` (Homebrew, keg-only) → `/opt/homebrew/opt/openjdk@17` |
| Android SDK | `android-commandlinetools` → `/opt/homebrew/share/android-commandlinetools` |
| `adb` | `$ANDROID_HOME/platform-tools/adb` (v37.0.1) |
| compileSdk / targetSdk | 36 · minSdk 24 · buildTools 36.0.0 · NDK 27.1.12297006 |
| applicationId | `com.nextech` |
| Máy test đang cắm | Redmi `23053RN02A`, Android 15, `arm64-v8a`, serial `68d659967d73` |
| APK debug xuất ra | `android/app/build/outputs/apk/debug/app-debug.apk` |

---

## 1. Chuẩn bị một lần

### 1.1 JDK 17 + Android SDK

Đã cài sẵn bằng Homebrew:

```bash
brew install openjdk@17
brew install --cask android-commandlinetools
```

`openjdk@17` là **keg-only** — không có trong `PATH` mặc định, nên gõ `java -version`
sẽ báo *"Unable to locate a Java Runtime"*. Đó là bình thường, Gradle chỉ cần `JAVA_HOME`.

### 1.2 Biến môi trường

Đã khai sẵn ở `~/.zshrc` (dòng 16–18):

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

Mở terminal mới hoặc `source ~/.zshrc` để có hiệu lực.

### 1.3 Nhận license SDK (nếu build lần đầu báo lỗi license)

```bash
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
```

### 1.4 `android/local.properties`

File này **không commit**, mỗi máy một khác. Trên máy này đang là:

```properties
sdk.dir=/opt/homebrew/share/android-commandlinetools
```

Máy nào cài Android Studio thì thường là `sdk.dir=/Users/<tên>/Library/Android/sdk`.

---

## 2. Chuẩn bị điện thoại

1. **Cài đặt → Giới thiệu điện thoại** → bấm 7 lần vào *Số phiên bản MIUI/Android*
   để mở **Tùy chọn nhà phát triển**.
2. Bật **Gỡ lỗi USB** (USB debugging). Máy Xiaomi/Redmi cần bật thêm
   **Cài đặt qua USB** (Install via USB) — không bật thì `adb install` sẽ fail.
3. Cắm cáp USB vào Mac, chọn chế độ **Truyền tệp / File transfer** (không để "Chỉ sạc").
4. Trên điện thoại hiện hộp thoại *Cho phép gỡ lỗi USB?* → tích **Luôn cho phép** → OK.

Kiểm tra:

```bash
adb devices -l
```

Phải thấy trạng thái `device`:

```
68d659967d73    device usb:1048576X product:fire_global model:23053RN02A
```

- `unauthorized` → chưa bấm OK trên điện thoại. Chạy `adb kill-server && adb devices` rồi bấm lại.
- Không thấy gì → đổi cáp (nhiều cáp chỉ sạc, không truyền dữ liệu) hoặc đổi cổng USB.

---

## 3. Cấu hình backend cho app

App đọc `mobile/.env` qua `react-native-config`. File này **gitignore**, phải tự tạo:

```bash
cp .env.example .env
```

Có 2 cách để điện thoại gọi được backend chạy trên Mac:

### Cách A — cắm USB, dùng `adb reverse` (đang dùng)

`.env` giữ nguyên `localhost`:

```properties
API_URL=http://127.0.0.1:8000/api
```

rồi bắc cầu cổng 8000 từ điện thoại về Mac:

```bash
adb reverse tcp:8000 tcp:8000
```

Ưu điểm: không phụ thuộc IP LAN, đổi WiFi không sao. Nhược điểm: **rút cáp là mất**,
cắm lại phải chạy lại lệnh trên.

> `react-native run-android` tự chạy `adb reverse tcp:8081` cho Metro, nhưng
> **không** tự làm cổng 8000 của backend — phải tự gõ.

### Cách B — dùng IP LAN

```bash
ipconfig getifaddr en0     # máy này: 172.16.10.59
```

rồi sửa `.env`:

```properties
API_URL=http://172.16.10.59:8000/api
```

Điện thoại và Mac phải chung một mạng WiFi.

> **Sửa `.env` là phải build lại** (`npm run android`). `react-native-config` nhúng giá
> trị vào lúc build, reload Metro không ăn.

Backend phải đang chạy:

```bash
cd ../backend && npm run start:dev     # cổng 8000
```

---

## 4. Build và cài

```bash
cd mobile
npm install          # lần đầu, hoặc sau khi đổi package.json
npm run android      # = react-native run-android
```

Lệnh này làm 3 việc: build APK debug bằng Gradle → `adb install` vào máy → tự khởi
động Metro (nếu chưa chạy) và `adb reverse tcp:8081`.

Nếu Metro đã chạy sẵn ở terminal khác thì thêm cờ để khỏi mở trùng:

```bash
npx react-native run-android --no-packager
```

Cắm nhiều máy cùng lúc thì chỉ định serial:

```bash
npx react-native run-android --device 68d659967d73
```

Lần build đầu mất **5–15 phút** (tải Gradle, build native của react-native-screens,
gesture-handler, svg…). Các lần sau khoảng 1–2 phút.

### Chỉ build APK, không cài

```bash
cd android
./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

Cài tay:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Build nhanh hơn (chỉ 1 kiến trúc)

Mặc định build cả 4 ABI (`armeabi-v7a, arm64-v8a, x86, x86_64`). Máy thật đời mới đều
là `arm64-v8a`, build 1 ABI nhanh hơn hẳn:

```bash
cd android
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a
```

---

## 5. Chạy app

Bản debug **cần Metro đang chạy** thì mới có JS bundle:

```bash
npm start
```

Mở app trên điện thoại. Lắc máy (hoặc `adb shell input keyevent 82`) để mở Dev Menu →
Reload / Debug.

Xem log:

```bash
npx react-native log-android
# hoặc lọc thô:
adb logcat -s ReactNativeJS:V ReactNative:V
```

---

## 6. Build bản release (APK chạy độc lập, không cần Metro)

```bash
cd android
./gradlew assembleRelease
# → app/build/outputs/apk/release/app-release.apk
```

**Hai điều bắt buộc trước khi build release:**

1. `.env` phải khai `API_URL` **và phải là HTTPS**. `src/api/client.ts` cố tình
   `throw` nếu thiếu `API_URL` ở bản release, còn Android release chặn HTTP thuần ở
   tầng OS (cleartext traffic).
2. Ký bằng keystore riêng. Hiện `android/app/build.gradle` đang để
   `release { signingConfig signingConfigs.debug }` — tức bản release đang ký bằng
   **debug keystore**, chỉ dùng để test nội bộ, **không đẩy lên Play Store được**.
   Cách tạo keystore thật: https://reactnative.dev/docs/signed-apk-android

---

## 7. Lỗi hay gặp

| Triệu chứng | Nguyên nhân / cách sửa |
|---|---|
| `Unable to locate a Java Runtime` | `openjdk@17` keg-only. Đặt `JAVA_HOME=/opt/homebrew/opt/openjdk@17`. |
| `SDK location not found` | Thiếu `android/local.properties` hoặc `ANDROID_HOME`. |
| `Failed to install ... INSTALL_FAILED_USER_RESTRICTED` | Máy Xiaomi chưa bật **Cài đặt qua USB** trong Tùy chọn nhà phát triển. |
| `device unauthorized` | Chưa xác nhận hộp thoại RSA trên máy. `adb kill-server` rồi cắm lại. |
| App mở ra màn hình đỏ *Unable to load script* | Metro chưa chạy, hoặc mất `adb reverse tcp:8081`. Chạy `npm start` + `adb reverse tcp:8081 tcp:8081`. |
| App chạy nhưng mọi request lỗi mạng | Sai `API_URL`, hoặc quên `adb reverse tcp:8000 tcp:8000`, hoặc backend chưa bật. |
| `Port 8081 already in use` | Metro đã chạy ở terminal khác — dùng `--no-packager`, hoặc `lsof -ti:8081 \| xargs kill`. |
| Build lỗi lạ sau khi đổi thư viện | `cd android && ./gradlew clean`, và `npx react-native start --reset-cache`. |
| Thêm thư viện có phần native | Chỉ cần build lại `npm run android` (autolinking). Riêng iOS mới cần `npm run pods`. |

---

## 8. Lệnh tóm tắt (copy-paste)

```bash
# terminal 1 — backend
cd backend && npm run start:dev

# terminal 2 — Metro
cd mobile && npm start

# terminal 3 — build & cài
cd mobile
adb devices -l                        # xác nhận máy ở trạng thái "device"
adb reverse tcp:8000 tcp:8000         # backend qua USB
npx react-native run-android --no-packager
```
