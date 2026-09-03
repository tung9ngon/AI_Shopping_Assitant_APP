// Nạp dữ liệu từ API cho một màn hình: giữ trạng thái đang tải / lỗi / dữ liệu và
// cho phép tải lại.
//
// Cờ `ignore` để bỏ qua kết quả của request cũ khi tham số đổi giữa chừng (vd người
// dùng đổi danh mục trước khi request trước trả về) — nếu không sẽ hiện nhầm dữ liệu.
import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../api/client';

// Fetcher nhận AbortSignal (tùy chọn dùng): truyền tiếp cho api.get để request cũ bị
// HỦY HẲN khi tham số đổi/màn hình unmount, thay vì chỉ bỏ kết quả mà vẫn chiếm kết
// nối tới hết timeout. Fetcher không nhận tham số vẫn hợp lệ như cũ.
export function useApi<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const reload = useCallback(() => setReloadTick((n) => n + 1), []);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetcher(controller.signal)
      .then((res) => {
        if (!ignore) setData(res);
      })
      .catch((err) => {
        if (ignore) return;
        setData(null);
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
      controller.abort();
    };
    // `fetcher` cố ý không nằm trong danh sách phụ thuộc: màn hình tạo hàm mới mỗi
    // lần render nên đưa vào sẽ gọi API vô hạn. Tham số thật nằm ở `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadTick]);

  return { data, loading, error, reload };
}
