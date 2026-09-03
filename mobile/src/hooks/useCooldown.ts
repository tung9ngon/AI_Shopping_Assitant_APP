// Đếm ngược chặn bấm "gửi lại OTP" dồn dập — mỗi lượt gửi cách nhau tối thiểu
// `seconds` giây. Dùng chung cho màn Đăng ký và Quên mật khẩu (trước đây mỗi màn
// một bản chép ref + interval).
import { useEffect, useRef, useState } from 'react';

export function useCooldown(seconds: number) {
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const startCooldown = () => {
    setCooldown(seconds);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  return { cooldown, startCooldown };
}
