// Phiên đăng nhập, gọi thật vào /api/auth.
//
// Backend chỉ đặt JWT vào cookie httpOnly, không trả token trong body, nên app không
// giữ token: cứ gọi API rồi để kho cookie của hệ điều hành tự gửi kèm (xem ghi chú ở
// src/api/client.ts). Vì vậy "đang đăng nhập hay không" phải hỏi máy chủ, không đọc
// được từ bộ nhớ máy.
//
// GET /auth/me trả bản rút gọn, thiếu phone_number / is_active / created_at mà màn
// Tài khoản và Hồ sơ cần — nên dùng GET /users/me (cùng phiên, cùng cookie).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import CookieManager from '@react-native-cookies/cookies';
import { authApi } from '../api/auth';
import { chatApi } from '../api/chat';
import { ApiError, setOnUnauthorized } from '../api/client';
import type { MeAccount, UpdateMePayload } from '../types';

interface AuthContextValue {
  user: MeAccount | null;
  isAuthenticated: boolean;
  /** true trong lúc kiểm tra phiên cũ ngay khi mở app */
  restoring: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Đổi mã một lần (từ deep link OAuth Google/Facebook) lấy phiên đăng nhập */
  signInWithOAuthCode: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (patch: UpdateMePayload) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeAccount | null>(null);
  const [restoring, setRestoring] = useState(true);

  // Hỏi máy chủ xem cookie còn hiệu lực không. 401 = chưa/hết đăng nhập, là trạng
  // thái bình thường chứ không phải lỗi — các lỗi khác (mất mạng, sai địa chỉ backend)
  // thì ném ra để nơi gọi hiển thị.
  const refreshUser = useCallback(async () => {
    try {
      setUser(await authApi.fullProfile());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        return;
      }
      // Lỗi khác 401 (rớt mạng vài giây, backend restart) thì GIỮ user hiện có —
      // cookie vẫn còn hiệu lực, xoá user ở đây làm cả app nhảy về "chưa đăng nhập"
      // và giỏ hàng bị reset oan.
      throw err;
    }
  }, []);

  // Bất kỳ request nào dính 401 (phiên hết hạn giữa chừng) thì đưa app về trạng thái
  // chưa đăng nhập ngay, không bắt người dùng nhìn chuỗi lỗi 401 ở từng màn hình.
  useEffect(() => {
    setOnUnauthorized(() => setUser(null));
    return () => setOnUnauthorized(null);
  }, []);

  useEffect(() => {
    refreshUser()
      .catch(() => {
        // Mở app mà không gọi được backend thì coi như chưa đăng nhập; màn hình nào
        // cần dữ liệu sẽ tự báo lỗi kèm nút thử lại.
      })
      .finally(() => setRestoring(false));
  }, [refreshUser]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await authApi.login(email, password);

      // Kéo các phiên chat hỏi lúc chưa đăng nhập trên máy này về tài khoản vừa vào,
      // nếu không chúng mất dấu (danh sách phiên chỉ liệt kê phiên của tài khoản).
      // Hỏng thì bỏ qua: gộp lịch sử không đáng để làm hỏng việc đăng nhập.
      await chatApi.claimConversations().catch(() => {});

      await refreshUser();
    },
    [refreshUser],
  );

  // Cùng các bước hậu đăng nhập với signIn, chỉ khác cách lấy cookie: đổi mã một lần
  // mà backend đưa về qua deep link sau khi người dùng xác thực Google/Facebook.
  const signInWithOAuthCode = useCallback(
    async (code: string) => {
      await authApi.oauthExchange(code);
      await chatApi.claimConversations().catch(() => {});
      await refreshUser();
    },
    [refreshUser],
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Gọi hỏng (mất mạng, phiên đã hết) cũng vẫn phải xoá phiên phía app,
      // không giữ người dùng ở lại màn hình đã đăng nhập.
    }
    // JWT nằm trong cookie httpOnly của kho cookie hệ điều hành — logout lúc mất mạng
    // mà không xoá thì refresh_token còn nguyên, mở lại app có mạng là tự đăng nhập
    // lại tài khoản cũ (nguy hiểm khi đưa máy cho người khác). Xoá cả kho cho chắc.
    await CookieManager.clearAll().catch(() => {});
    setUser(null);
  }, []);

  // Màn Hồ sơ cá nhân đã gọi PUT /users/me xong thì cập nhật tại chỗ, khỏi tải lại.
  const updateUser = useCallback((patch: UpdateMePayload) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      restoring,
      signIn,
      signInWithOAuthCode,
      signOut,
      refreshUser,
      updateUser,
    }),
    [user, restoring, signIn, signInWithOAuthCode, signOut, refreshUser, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider');
  return ctx;
}
