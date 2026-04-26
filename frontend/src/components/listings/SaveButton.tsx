'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export function SaveButton({ listingId }: { listingId: string }) {
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  void listingId;

  const handleClick = () => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    setSaved(!saved);
  };

  return (
    <button
      onClick={handleClick}
      title={saved ? 'Bỏ lưu' : 'Lưu tin'}
      className={`flex items-center gap-1.5 shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        saved
          ? 'border-red-300 bg-red-50 text-red-500'
          : 'border-gray-200 bg-white text-gray-500 hover:border-red-300 hover:text-red-500'
      }`}
    >
      <Heart className={`h-3.5 w-3.5 ${saved ? 'fill-current' : ''}`} />
      {saved ? 'Đã lưu' : 'Lưu'}
    </button>
  );
}
