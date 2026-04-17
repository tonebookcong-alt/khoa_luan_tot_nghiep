'use client';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';

interface Transaction {
  id: string;
}
interface Props {
  listingId: string;
  sellerId: string;
  listingStatus: string;
}

export function BuyNowButton({ listingId, sellerId, listingStatus }: Props) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  if (user?.id === sellerId || listingStatus !== 'ACTIVE') return null;

  const handleBuy = async () => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ transaction: Transaction; paymentUrl: string }>(
        '/transactions',
        { listingId },
      );
      // Chuyển đến trang VNPAY
      window.location.href = res.data.paymentUrl;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Không thể tạo giao dịch. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      className="w-full bg-green-600 hover:bg-green-700 text-white"
      onClick={handleBuy}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
      Mua ngay qua VNPAY
    </Button>
  );
}
