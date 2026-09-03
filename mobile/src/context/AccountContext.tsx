// Dữ liệu tài khoản dùng chung: sổ địa chỉ, hồ sơ mua sắm, sở thích. Cả ba đều thuộc
// nhóm endpoint /users/me của backend nên gom một chỗ.
//
// Sổ địa chỉ buộc phải nằm ở đây chứ không giữ trong màn hình: màn Đặt hàng cũng đọc
// danh sách này, thêm địa chỉ mới ở Sổ địa chỉ phải hiện ra ngay khi đặt hàng.
//
// Cả ba đều đã gọi thật: /users/me/addresses, /users/me/profile, /users/me/preferences.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { addressApi, type AddressInput } from '../api/addresses';
import {
  profileApi,
  type UpdatePreferencesPayload,
  type UpdateShoppingProfilePayload,
} from '../api/profile';
import { getErrorMessage } from '../api/client';
import { useAuth } from './AuthContext';
import type { Address, ShoppingProfile, UserPreferences } from '../types';

export type { AddressInput };

interface AccountContextValue {
  addresses: Address[];
  defaultAddress: Address | null;
  addressesLoading: boolean;
  addressesError: string | null;
  reloadAddresses: () => Promise<void>;
  addAddress: (input: AddressInput) => Promise<void>;
  updateAddress: (id: string, input: AddressInput) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;

  // null = chưa tải xong (hoặc chưa đăng nhập). Màn hình phải chờ có dữ liệu rồi mới
  // dựng form, nếu không ô nhập sẽ khởi tạo rỗng rồi không tự điền lại.
  shoppingProfile: ShoppingProfile | null;
  preferences: UserPreferences | null;
  profileLoading: boolean;
  profileError: string | null;
  reloadProfile: () => Promise<void>;
  updateShoppingProfile: (patch: UpdateShoppingProfilePayload) => Promise<void>;
  updatePreferences: (patch: UpdatePreferencesPayload) => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [shoppingProfile, setShoppingProfile] = useState<ShoppingProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Mảng rỗng có hai nghĩa: "tài khoản chưa có địa chỉ" và "chưa tải được danh sách"
  // (lỗi mạng). Cờ này phân biệt hai trường hợp — chỉ true sau ít nhất một lần tải
  // thành công.
  const addressesLoadedRef = useRef(false);

  // Sổ địa chỉ gắn với tài khoản, chưa đăng nhập thì không gọi để khỏi nhận 401.
  const reloadAddresses = useCallback(async () => {
    if (!isAuthenticated) {
      setAddresses([]);
      addressesLoadedRef.current = false;
      return;
    }
    setAddressesLoading(true);
    setAddressesError(null);
    try {
      setAddresses(await addressApi.list());
      addressesLoadedRef.current = true;
    } catch (err) {
      setAddressesError(getErrorMessage(err));
    } finally {
      setAddressesLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    reloadAddresses();
  }, [reloadAddresses]);

  // Backend tự gỡ cờ mặc định của các địa chỉ còn lại, nên sau mỗi thao tác chỉ cần
  // tải lại danh sách thay vì tự sửa mảng trong máy.
  const addAddress = useCallback(
    async (input: AddressInput) => {
      // Địa chỉ đầu tiên luôn là mặc định, kể cả khi người dùng không tích chọn —
      // nếu không, tài khoản có địa chỉ mà không địa chỉ nào được đánh dấu. Nhưng chỉ
      // ép khi danh sách ĐÃ tải thành công: mảng rỗng do lỗi mạng mà ép is_default
      // thì đè mất địa chỉ mặc định thật người dùng đã chọn.
      const isFirstAddress = addressesLoadedRef.current && addresses.length === 0;
      await addressApi.create({ ...input, is_default: isFirstAddress ? true : input.is_default });
      await reloadAddresses();
    },
    [addresses.length, reloadAddresses],
  );

  const updateAddress = useCallback(
    async (id: string, input: AddressInput) => {
      await addressApi.update(id, input);
      await reloadAddresses();
    },
    [reloadAddresses],
  );

  const removeAddress = useCallback(
    async (id: string) => {
      await addressApi.remove(id);
      await reloadAddresses();
    },
    [reloadAddresses],
  );

  const setDefaultAddress = useCallback(
    async (id: string) => {
      await addressApi.setDefault(id);
      await reloadAddresses();
    },
    [reloadAddresses],
  );

  // Hồ sơ mua sắm và sở thích luôn đi cùng nhau trên màn Sở thích mua sắm nên tải
  // một lượt.
  const reloadProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setShoppingProfile(null);
      setPreferences(null);
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      const [profile, prefs] = await Promise.all([
        profileApi.getShoppingProfile(),
        profileApi.getPreferences(),
      ]);
      setShoppingProfile(profile);
      setPreferences(prefs);
    } catch (err) {
      setProfileError(getErrorMessage(err));
    } finally {
      setProfileLoading(false);
    }
  }, [isAuthenticated]);

  // KHÔNG tải sẵn lúc mở app: hồ sơ/sở thích chỉ mỗi màn Sở thích mua sắm dùng,
  // tải chen vào đợt fetch khởi động chỉ làm chậm màn Trang chủ. Màn đó tự gọi
  // reloadProfile khi mở. Ở đây chỉ dọn dữ liệu của tài khoản trước khi đổi phiên.
  useEffect(() => {
    setShoppingProfile(null);
    setPreferences(null);
    setProfileError(null);
  }, [isAuthenticated]);

  const updateShoppingProfile = useCallback(async (patch: UpdateShoppingProfilePayload) => {
    setShoppingProfile(await profileApi.updateShoppingProfile(patch));
  }, []);

  const updatePreferences = useCallback(async (patch: UpdatePreferencesPayload) => {
    const saved = await profileApi.updatePreferences(patch);
    // Phản hồi PUT không kèm last_intent_summary (do AI ghi, không sửa qua API) —
    // giữ nguyên giá trị đang có thay vì để mất khi lưu.
    setPreferences((prev) => ({ ...saved, last_intent_summary: prev?.last_intent_summary ?? null }));
  }, []);

  // Backend xoá địa chỉ mặc định thì không đôn địa chỉ khác lên thay, nên vẫn phải
  // có đường lui về địa chỉ đầu danh sách để màn Đặt hàng luôn có cái để chọn.
  const defaultAddress = useMemo(
    () => addresses.find((a) => a.is_default) ?? addresses[0] ?? null,
    [addresses],
  );

  const value = useMemo(
    () => ({
      addresses,
      defaultAddress,
      addressesLoading,
      addressesError,
      reloadAddresses,
      addAddress,
      updateAddress,
      removeAddress,
      setDefaultAddress,
      shoppingProfile,
      preferences,
      profileLoading,
      profileError,
      reloadProfile,
      updateShoppingProfile,
      updatePreferences,
    }),
    [
      addresses,
      defaultAddress,
      addressesLoading,
      addressesError,
      reloadAddresses,
      addAddress,
      updateAddress,
      removeAddress,
      setDefaultAddress,
      shoppingProfile,
      preferences,
      profileLoading,
      profileError,
      reloadProfile,
      updateShoppingProfile,
      updatePreferences,
    ],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount phải nằm trong AccountProvider');
  return ctx;
}
