// Nhóm /api/categories. Public, không cần đăng nhập.
import { api } from './client';
import type { Category } from '../types';

export const categoryApi = {
  list: () => api.get<Category[]>('/categories'),
};
