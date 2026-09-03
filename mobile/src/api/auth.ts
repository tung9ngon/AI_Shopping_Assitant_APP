// Nhóm /api/auth. Đăng nhập thành công thì backend đặt cookie, không trả token —
// muốn biết mình là ai phải gọi tiếp `me()`.
import { api } from './client';
import type { MeAccount, UserRole } from '../types';

export interface AuthMe {
  id: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
}

export const authApi = {
  // --- Đăng ký: gửi OTP -> xác thực OTP -> đặt mật khẩu ---
  sendOtp: (email: string) => api.post<{ message: string }>('/auth/send-otp', { email }),
  verifyOtp: (email: string, otp: string) =>
    api.post<{ message: string }>('/auth/verify-otp', { email, otp }),
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post<{ message: string }>('/auth/register', data),

  // --- Quên mật khẩu: cùng ba bước, khác nhóm endpoint ---
  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),
  verifyResetOtp: (email: string, otp: string) =>
    api.post<{ message: string }>('/auth/verify-reset-otp', { email, otp }),
  // Backend nhận trường `new_password` (ResetPasswordDto) — gửi sai tên là bị
  // ValidationPipe whitelist gạt bỏ và trả 400.
  resetPassword: (email: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { email, new_password: password }),

  login: (email: string, password: string) =>
    api.post<{ message: string; user: { id: string; email: string | null; full_name: string } }>(
      '/auth/login',
      { email, password },
    ),
  logout: () => api.post<{ message: string }>('/auth/logout'),

  // UC-AUTH-03: đổi mã một lần (nhận từ deep link nextech://oauth?code=...) lấy
  // cookie phiên — backend trả cùng dạng với login.
  oauthExchange: (code: string) =>
    api.post<{ message: string; user: { id: string; email: string | null; full_name: string } }>(
      '/auth/oauth/exchange',
      { code },
    ),

  // GET /auth/me trả bản rút gọn; GET /users/me (profileApi) mới có phone_number,
  // is_active, created_at.
  me: () => api.get<AuthMe>('/auth/me'),
  fullProfile: () => api.get<MeAccount>('/users/me'),
};
