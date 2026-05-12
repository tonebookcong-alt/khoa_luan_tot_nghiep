'use client';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Thanh progress mảnh chạy ngang trên cùng, tự kích hoạt khi route thay đổi.
 * Không cần thư viện ngoài — chỉ CSS animation.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setVisible(true);
    setProgress(15);

    const t1 = setTimeout(() => setProgress(45), 80);
    const t2 = setTimeout(() => setProgress(75), 280);
    const t3 = setTimeout(() => setProgress(92), 700);
    const t4 = setTimeout(() => {
      setProgress(100);
    }, 900);
    const t5 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 1200);

    return () => {
      [t1, t2, t3, t4, t5].forEach(clearTimeout);
    };
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[60] pointer-events-none h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 250ms' }}
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 shadow-[0_0_8px_rgba(124,58,237,0.5)]"
        style={{
          width: `${progress}%`,
          transition: progress === 0 ? 'none' : 'width 200ms ease-out',
        }}
      />
    </div>
  );
}
