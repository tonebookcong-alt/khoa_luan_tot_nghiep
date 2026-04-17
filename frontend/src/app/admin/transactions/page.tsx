'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TxRow {
  id: string;
  amount: number;
  commission: number;
  status: string;
  vnpayRef: string | null;
  createdAt: string;
  listing: { id: string; title: string };
  buyer: { id: string; name: string };
  seller: { id: string; name: string };
}

interface Paginated { data: TxRow[]; total: number; page: number; totalPages: number }

const STATUS_OPTIONS = ['', 'PENDING', 'ESCROWED', 'COMPLETED', 'REFUNDED', 'DISPUTED'];
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ TT', ESCROWED: 'Đang giữ', COMPLETED: 'Hoàn thành',
  REFUNDED: 'Hoàn tiền', DISPUTED: 'Tranh chấp',
};
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'destructive'> = {
  PENDING: 'secondary', ESCROWED: 'default', COMPLETED: 'success',
  REFUNDED: 'secondary', DISPUTED: 'destructive',
};

export default function AdminTransactionsPage() {
  const [result, setResult] = useState<Paginated | null>(null);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (p: number, status: string) => {
    setLoading(true);
    const q = status ? `&status=${status}` : '';
    api.get<Paginated>(`/admin/transactions?page=${p}&limit=20${q}`)
      .then((r) => { setResult(r.data); setPage(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1, filterStatus); }, [filterStatus]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý giao dịch</h1>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s ? STATUS_LABEL[s] : 'Tất cả'}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  {['Tin đăng', 'Người mua', 'Người bán', 'Số tiền', 'Hoa hồng', 'Trạng thái', 'Ngày'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result?.data.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/listings/${tx.listing.id}`} target="_blank" className="font-medium text-gray-900 hover:text-primary truncate block max-w-40">
                        {tx.listing.title}
                      </Link>
                      {tx.vnpayRef && <p className="text-xs text-gray-400 font-mono">{tx.vnpayRef}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{tx.buyer.name}</td>
                    <td className="px-4 py-3 text-gray-700">{tx.seller.name}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(tx.amount)}</td>
                    <td className="px-4 py-3 text-green-700 font-medium">{formatPrice(tx.commission)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[tx.status] ?? 'secondary'}>
                        {STATUS_LABEL[tx.status] ?? tx.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result && result.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1, filterStatus)}>← Trước</Button>
              <span className="text-sm text-gray-500">{page} / {result.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= result.totalPages} onClick={() => load(page + 1, filterStatus)}>Tiếp →</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
