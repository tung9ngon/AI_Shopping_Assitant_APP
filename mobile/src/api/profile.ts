// Nhóm /api/users/me — tài khoản, hồ sơ mua sắm, sở thích. Đều cần đăng nhập.
//
// Ba nhóm dữ liệu nằm ở ba endpoint riêng vì backend lưu ở ba bảng khác nhau
// (users, user_profiles, user_preferences). Bản ghi hồ sơ/sở thích được tạo lúc lưu
// lần đầu, nên GET khi chưa có trả về bản rỗng chứ không phải 404.
import { api } from './client';
import type { BudgetRange, MeAccount, ShoppingProfile, UpdateMePayload, UserPreferences } from '../types';

// PUT /users/me trả bản rút gọn, không đủ cho màn Tài khoản — muốn bản đầy đủ thì
// gọi lại GET /users/me (authApi.fullProfile).
export interface UpdatedMe {
  id: string;
  full_name: string;
  phone_number: string | null;
  avatar_url: string | null;
  updated_at: string;
}

export interface UpdateShoppingProfilePayload {
  user_segment?: string | null;
  occupation?: string | null;
  age_range?: string | null;
  interests?: string[];
}

export interface UpdatePreferencesPayload {
  preferred_categories?: string[];
  budget_range?: BudgetRange | null;
  preferred_brands?: string[];
  preferred_attributes?: Record<string, unknown>;
  // last_intent_summary do trợ lý AI ghi, backend không nhận sửa từ app.
}

export const profileApi = {
  getMe: () => api.get<MeAccount>('/users/me'),
  updateMe: (payload: UpdateMePayload) => api.put<UpdatedMe>('/users/me', payload),

  getShoppingProfile: () => api.get<ShoppingProfile>('/users/me/profile'),
  updateShoppingProfile: (payload: UpdateShoppingProfilePayload) =>
    api.put<ShoppingProfile>('/users/me/profile', payload),

  getPreferences: () => api.get<UserPreferences>('/users/me/preferences'),
  // Phản hồi PUT không kèm last_intent_summary — giữ lại giá trị đang có ở phía app.
  updatePreferences: (payload: UpdatePreferencesPayload) =>
    api.put<Omit<UserPreferences, 'last_intent_summary'>>('/users/me/preferences', payload),
};
