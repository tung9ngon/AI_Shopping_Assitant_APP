// Nhóm /api/users/me/addresses. Tất cả đều cần đăng nhập (JwtAccessGuard).
//
// Backend giữ bất biến "mỗi tài khoản chỉ một địa chỉ mặc định": POST/PUT với
// is_default = true và PUT :id/default đều tự gỡ cờ của các địa chỉ còn lại. App không
// cần tự sửa danh sách, chỉ cần tải lại sau mỗi thao tác.
import { api } from './client';
import type { Address } from '../types';

export interface AddressInput {
  full_address: string;
  recipient_name?: string;
  phone_number?: string;
  is_default?: boolean;
}

export const addressApi = {
  list: () => api.get<Address[]>('/users/me/addresses'),
  create: (input: AddressInput) => api.post<Address>('/users/me/addresses', input),
  update: (id: string, input: Partial<AddressInput>) =>
    api.put<Address>(`/users/me/addresses/${id}`, input),
  setDefault: (id: string) => api.put<Address>(`/users/me/addresses/${id}/default`),
  remove: (id: string) => api.del<{ message: string }>(`/users/me/addresses/${id}`),
};
