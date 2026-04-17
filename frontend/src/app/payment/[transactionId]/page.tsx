'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2, Clock, ShieldCheck, XCircle, Loader2, AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { formatPrice, formatDate } from '@/lib/utils';

type TxStatus = 'PENDING' | 'ESCROWED' | 'COMPLETED' | 'REFUNDED' | 'DISPUTED';

interface Transaction {
  id: string;
  amount: number;
  commission: number;
  status: TxStatus;
  vnpayRef: string | null;
  confirmedByBuyer: boolean;
  confirmedBySeller: boolean;
  createdAt: string;
  updatedAt: string;
  listing: { id: string; title: string; askingPrice: number; images: { url: string }[] };
  buyer: { id: string; name: string };
  seller: { id: string; name: string };
}

const STATUS_CONFIG: Record<TxStatus, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
  PENDING: {
    label: 'Chờ thanh toán',
    color: 'text-yellow-600',
    icon: <Clock className="h-12 w-12 text-yellow-500" />,
    desc: 'Giao dịch đã được tạo. Vui lòng hoàn tất thanh toán qua VNPAY.',
  },
  ESCROWED: {
    label: 'Đang giữ tiền',
    color: 'text-blue-600',
    icon: <ShieldCheck className="h-12 w-12 text-blue-500" />,
    desc: 'Tiền đã được VNPAY xác nhận và đang được giữ an toàn. Sau khi nhận máy, cả hai bên xác nhận để hoàn tất.',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    color: 'text-green-600',
    icon: <CheckCircle2 className="h-12 w-12 text-green-500" />,
    desc: 'Giao dịch đã hoàn tất thành công. Tiền đã được chuyển cho người bán.',
  },
  REFUNDED: {
    label: 'Đã hoàn tiền',
    color: 'text-gray-600',
    icon: <XCircle className="h-12 w-12 text-gray-500" />,
    desc: 'Giao dịch đã bị hủy và tiền đã được hoàn trả.',
  },
  DISPUTED: {
    label: 'Đang tranh chấp',
    color: 'text-red-600',
    icon: <AlertCircle className="h-12 w-12 text-red-500" />,
    desc: 'Giao dịch đang trong quá trình xử lý tranh chấp. Vui lòng liên hệ hỗ trợ.',
  },
};

export default function PaymentPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Thông báo từ VNPAY redirect
  const vnpResponseCode = searchParams.get('vnp_ResponseCode');
  const vnpSuccess = vnpResponseCode === '00';
  const showVnpResult = !!vnpResponseCode;

  const fetchTransaction = useCallback(async () => {
    try {
      const res = await api.get<Transaction>(`/transactions/${transactionId}`);
      setTransaction(res.data);
    } catch {
      setError('Không tìm thấy giao dịch hoặc bạn không có quyền xem.');
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await api.post<Transaction>(`/transactions/${transactionId}/confirm`);
      setTransaction((prev) => prev ? { ...prev, ...res.data } : prev);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Không thể xác nhận. Vui lòng thử lại.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-slate-600">{error ?? 'Đã có lỗi xảy ra.'}</p>
        <Button asChild variant="outline"><Link href="/">Về trang chủ</Link></Button>
      </div>
    );
  }

  const config = STATUS_CONFIG[transaction.status];
  const isBuyer = user?.id === transaction.buyer.id;
  const isSeller = user?.id === transaction.seller.id;
  const canConfirm =
    transaction.status === 'ESCROWED' &&
    ((isBuyer && !transaction.confirmedByBuyer) ||
     (isSeller && !transaction.confirmedBySeller));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* VNPAY return banner */}
      {showVnpResult && (
        <div className={`mb-6 rounded-xl p-4 flex items-center gap-3 ${vnpSuccess ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {vnpSuccess
            ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            : <XCircle className="h-5 w-5 text-red-600 shrink-0" />}
          <p className={`text-sm font-medium ${vnpSuccess ? 'text-green-800' : 'text-red-800'}`}>
            {vnpSuccess
              ? 'Thanh toán thành công! Tiền đã được giữ an toàn cho đến khi giao dịch hoàn tất.'
              : 'Thanh toán không thành công hoặc đã bị hủy.'}
          </p>
        </div>
      )}

      {/* Status card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="flex justify-center mb-4">{config.icon}</div>
        <h1 className={`text-2xl font-bold ${config.color}`}>{config.label}</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">{config.desc}</p>
      </div>

      {/* Transaction details */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Chi tiết giao dịch</h2>

        {/* Listing */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
          {transaction.listing.images?.[0] && (
            <img
              src={transaction.listing.images[0].url}
              alt={transaction.listing.title}
              className="h-14 w-14 rounded-lg object-cover shrink-0"
            />
          )}
          <div>
            <Link
              href={`/listings/${transaction.listing.id}`}
              className="font-medium text-gray-900 hover:text-primary line-clamp-1"
            >
              {transaction.listing.title}
            </Link>
            <p className="text-sm text-slate-500">Giá niêm yết: {formatPrice(transaction.listing.askingPrice)}</p>
          </div>
        </div>

        {/* Amounts */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Tổng thanh toán</span>
            <span className="font-semibold text-gray-900">{formatPrice(transaction.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Phí dịch vụ (3%)</span>
            <span className="text-gray-700">{formatPrice(transaction.commission)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Người mua</span>
            <span className="text-gray-700">{transaction.buyer.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Người bán</span>
            <span className="text-gray-700">{transaction.seller.name}</span>
          </div>
          {transaction.vnpayRef && (
            <div className="flex justify-between">
              <span className="text-slate-500">Mã VNPAY</span>
              <span className="font-mono text-xs text-gray-700">{transaction.vnpayRef}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Ngày tạo</span>
            <span className="text-gray-700">{formatDate(transaction.createdAt)}</span>
          </div>
        </div>

        {/* Confirmation status (ESCROWED) */}
        {transaction.status === 'ESCROWED' && (
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-2">
            <p className="text-sm font-semibold text-blue-800">Trạng thái xác nhận</p>
            <div className="flex justify-between text-sm">
              <span className="text-blue-700">Người mua xác nhận</span>
              <span>{transaction.confirmedByBuyer ? '✅' : '⏳ Chờ'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-700">Người bán xác nhận</span>
              <span>{transaction.confirmedBySeller ? '✅' : '⏳ Chờ'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3">
        {canConfirm && (
          <Button className="w-full" onClick={handleConfirm} disabled={confirming}>
            {confirming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isBuyer ? 'Xác nhận đã nhận máy' : 'Xác nhận đã giao máy'}
          </Button>
        )}

        {transaction.status === 'PENDING' && (
          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            onClick={() => window.history.back()}
            variant="outline"
          >
            Quay lại
          </Button>
        )}

        <Button variant="outline" className="w-full" asChild>
          <Link href="/dashboard/listings">Quản lý tin đăng</Link>
        </Button>
      </div>
    </div>
  );
}
