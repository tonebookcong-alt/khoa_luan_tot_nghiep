'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { formatPrice, formatDate, getImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ListingRow {
  id: string;
  title: string;
  brand: string;
  model: string;
  askingPrice: number;
  status: string;
  condition: string;
  createdAt: string;
  seller: { id: string; name: string; email: string };
  images: { url: string }[];
}

interface Paginated { data: ListingRow[]; total: number; page: number; totalPages: number }

const STATUS_OPTIONS = ['', 'DRAFT', 'ACTIVE', 'SOLD', 'REMOVED', 'RESERVED'];
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp', ACTIVE: 'Đang bán', SOLD: 'Đã bán', REMOVED: 'Đã xóa', RESERVED: 'Đã đặt',
};
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'destructive'> = {
  ACTIVE: 'success', DRAFT: 'secondary', SOLD: 'default', REMOVED: 'destructive', RESERVED: 'secondary',
};

export default function AdminListingsPage() {
  const [result, setResult] = useState<Paginated | null>(null);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = (p: number, status: string) => {
    setLoading(true);
    const q = status ? `&status=${status}` : '';
    api.get<Paginated>(`/admin/listings?page=${p}&limit=20${q}`)
      .then((r) => { setResult(r.data); setPage(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1, filterStatus); }, [filterStatus]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await api.patch(`/admin/listings/${id}/status`, { status });
      setResult((prev) =>
        prev
          ? { ...prev, data: prev.data.map((l) => l.id === id ? { ...l, status } : l) }
          : prev,
      );
    } catch { /* ignore */ }
    finally { setUpdating(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý tin đăng</h1>
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
                  {['Tin đăng', 'Người bán', 'Giá', 'Trạng thái', 'Ngày đăng', 'Hành động'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result?.data.map((listing) => (
                  <tr key={listing.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {listing.images?.[0] ? (
                          <img src={getImageUrl(listing.images[0].url)} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gray-100 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <Link href={`/listings/${listing.id}`} target="_blank" className="font-medium text-gray-900 hover:text-primary truncate block max-w-48">
                            {listing.title}
                          </Link>
                          <p className="text-xs text-gray-400">{listing.brand} {listing.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{listing.seller.name}</p>
                      <p className="text-xs text-gray-400">{listing.seller.email}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatPrice(listing.askingPrice)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[listing.status] ?? 'secondary'}>
                        {STATUS_LABEL[listing.status] ?? listing.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(listing.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {listing.status !== 'ACTIVE' && (
                          <Button
                            size="sm" variant="outline"
                            className="text-xs h-7 text-green-700 border-green-200 hover:bg-green-50"
                            onClick={() => updateStatus(listing.id, 'ACTIVE')}
                            disabled={updating === listing.id}
                          >
                            Duyệt
                          </Button>
                        )}
                        {listing.status !== 'REMOVED' && (
                          <Button
                            size="sm" variant="destructive"
                            className="text-xs h-7"
                            onClick={() => updateStatus(listing.id, 'REMOVED')}
                            disabled={updating === listing.id}
                          >
                            {updating === listing.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Từ chối'}
                          </Button>
                        )}
                      </div>
                    </td>
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
