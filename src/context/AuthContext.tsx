// Phiên đăng nhập cho vòng dựng giao diện.
//
// Chưa gọi backend: mục 3.4 của tài liệu giới thiệu ghi rõ BE hiện chỉ đọc JWT từ cookie
// (BE/src/users/auth/jwt.strategy.ts), chưa nhận header Authorization — phải mở rộng BE
// trước khi app đăng nhập thật được. Ở đây chỉ giữ trạng thái để đi hết luồng màn hình.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { mockAccount } from '../mocks/data';
import type { MeAccount } from '../types';

interface AuthContextValue {
  user: MeAccount | null;
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeAccount | null>(mockAccount);

  const signIn = useCallback(() => setUser(mockAccount), []);
  const signOut = useCallback(() => setUser(null), []);

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, signIn, signOut }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider');
  return ctx;
}
