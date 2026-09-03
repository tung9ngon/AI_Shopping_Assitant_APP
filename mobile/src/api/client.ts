// Lớp gọi API dùng chung.
//
// Phiên đăng nhập đi bằng cookie httpOnly: backend đặt `access_token` /`refresh_token`
// qua Set-Cookie (BE/src/users/auth/auth.controller.ts) và KHÔNG trả token trong body.
// React Native gửi lại cookie đó bằng kho cookie của hệ điều hành, nên app không phải
// tự cầm token. Tài liệu React Native có ghi "cookie based authentication is currently
// unstable", lỗi đã biết nằm ở luồng chuyển hướng 302 — tức đăng nhập Google/Facebook,
// còn đăng nhập bằng email thì không dính.
//
// Không cần tự gọi /auth/refresh khi gặp 401: JwtAccessGuard của backend đã tự làm mới
// ngầm bằng refresh_token rồi mới trả lỗi. 401 nghĩa là phiên hỏng thật.
import { NativeModules } from 'react-native';
import Config from 'react-native-config';

const DEFAULT_API_PORT = '8000'; // PORT trong backend/.env
const REQUEST_TIMEOUT_MS = 15000;

// Địa chỉ backend. Khai trong mobile/.env:  API_URL=http://192.168.1.5:8000/api
// Chưa khai thì đoán backend chạy cùng máy với Metro — lấy IP từ URL gói bundle
// (vd http://192.168.1.5:8081/index.bundle). Không dùng localhost làm mặc định vì trên
// điện thoại thật localhost là chính cái điện thoại đó.
function resolveBaseUrl(): string {
  const fromEnv = Config.API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  // Bản release không đoán được: không có Metro nên scriptURL là assets://... (parse ra
  // host rác), và Android release chặn HTTP thuần ở tầng OS. Chết sớm với thông báo rõ
  // còn hơn chạy tiếp rồi mọi request lỗi im lặng.
  if (!__DEV__) {
    throw new Error(
      'Thiếu API_URL trong mobile/.env — bản release bắt buộc khai API_URL và phải là HTTPS.',
    );
  }

  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  const host = scriptURL?.split('://')[1]?.split(':')[0];
  return `http://${host ?? 'localhost'}:${DEFAULT_API_PORT}/api`;
}

export const API_BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// AuthContext đăng ký handler lúc mount; để rời ra đây (client không import ngược
// AuthContext) tránh vòng phụ thuộc.
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query): string {
  if (!query) return `${API_BASE_URL}${path}`;
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `${API_BASE_URL}${path}?${parts.join('&')}` : `${API_BASE_URL}${path}`;
}

// NestJS trả lỗi dạng { statusCode, message: string | string[], error }.
// ValidationPipe trả mảng message — nối lại để hiện đủ cho người dùng.
function extractMessage(body: unknown, status: number): string {
  const message = (body as { message?: unknown })?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message) return message;
  return `Lỗi ${status}, vui lòng thử lại.`;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  options: { body?: unknown; query?: Query; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  // Sai IP backend thì fetch treo rất lâu — tự huỷ để màn hình báo lỗi được.
  // timeoutMs cho các request chậm chính đáng (chat AI) đặt hạn riêng dài hơn.
  // signal cho nơi gọi (useApi) huỷ hẳn request cũ khi tham số đổi, không chỉ bỏ
  // kết quả — mạng chậm mà gõ tìm kiếm liên tục thì request treo không dồn đống.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onOuterAbort);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      credentials: 'include',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onOuterAbort);
    if ((err as Error)?.name === 'AbortError') {
      throw new ApiError(0, `Máy chủ không phản hồi (${API_BASE_URL}). Kiểm tra backend đã chạy chưa.`);
    }
    throw new ApiError(0, `Không kết nối được tới ${API_BASE_URL}.`);
  }
  clearTimeout(timeout);
  options.signal?.removeEventListener('abort', onOuterAbort);

  const text = await response.text();

  // Trỏ nhầm địa chỉ (vd vào cổng Metro) thì nhận về HTML chứ không phải JSON —
  // báo rõ thay vì ném lỗi cú pháp JSON khó hiểu.
  let body: unknown;
  try {
    body = text ? (JSON.parse(text) as unknown) : undefined;
  } catch {
    throw new ApiError(
      response.status,
      `Máy chủ trả về dữ liệu không phải JSON. Kiểm tra lại API_URL (${API_BASE_URL}).`,
    );
  }

  if (!response.ok) {
    // 401 ở bất kỳ request nào nghĩa là phiên đã chết thật (JwtAccessGuard đã tự thử
    // refresh trước khi trả 401) — báo cho AuthContext đưa app về trạng thái chưa
    // đăng nhập, thay vì để từng màn hình tự hiện chuỗi lỗi 401.
    if (response.status === 401) onUnauthorized?.();
    throw new ApiError(response.status, extractMessage(body, response.status));
  }
  return body as T;
}

export const api = {
  get: <T>(path: string, query?: Query, opts?: { signal?: AbortSignal }) =>
    request<T>('GET', path, { query, signal: opts?.signal }),
  post: <T>(path: string, body?: unknown, opts?: { timeoutMs?: number }) =>
    request<T>('POST', path, { body, timeoutMs: opts?.timeoutMs }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  del: <T>(path: string) => request<T>('DELETE', path),
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Đã có lỗi xảy ra, vui lòng thử lại.';
}
