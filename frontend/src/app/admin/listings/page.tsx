'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, Loader2, Search, X } from 'lucide-react';
import { api } from '@/lib/axios';
import { formatPrice, formatDate, getImageUrl } from '@/lib/utils';
import { exportCsv } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/Pagination';

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

interface Paginated { data: ListingRow[]; total: number; page: number; limit: number; totalPages: number }

const STATUS_OPTIONS = ['', 'DRAFT', 'ACTIVE', 'SOLD', 'REMOVED', 'RESERVED'];
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp', ACTIVE: 'Đang bán', SOLD: 'Đã bán', REMOVED: 'Đã xóa', RESERVED: 'Đã đặt',
};
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'destructive'> = {
  ACTIVE: 'success', DRAFT: 'secondary', SOLD: 'default', REMOVED: 'destructive', RESERVED: 'secondary',
};

const PAGE_SIZE = 10;

export default function AdminListingsPage() {
  const [result, setResult] = useState<Paginated | null>(null);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput.trim().toLowerCase());
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(PAGE_SIZE));
    if (filterStatus) p.set('status', filterStatus);
    return p.toString();
  }, [page, filterStatus]);

  useEffect(() => {
    setLoading(true);
    api
      .get<Paginated>(`/admin/listings?${queryString}`)
      .then((r) => setResult(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [queryString]);

  // Reset về trang 1 khi đổi filter
  useEffect(() => { setPage(1); }, [filterStatus]);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      const p = new URLSearchParams();
      p.set('page', '1');
      p.set('limit', '10000');
      if (filterStatus) p.set('status', filterStatus);
      const r = await api.get<Paginated>(`/admin/listings?${p.toString()}`);
      exportCsv<ListingRow>({
        filename: 'tin-dang',
        rows: r.data.data,
        columns: [
          { header: 'ID', value: (l) => l.id },
          { header: 'Tiêu đề', value: (l) => l.title },
          { header: 'Hãng', value: (l) => l.brand },
          { header: 'Model', value: (l) => l.model },
          { header: 'Giá rao', value: (l) => l.askingPrice },
          { header: 'Trạng thái', value: (l) => STATUS_LABEL[l.status] ?? l.status },
          { header: 'Tình trạng', value: (l) => l.condition },
          { header: 'Người bán', value: (l) => l.seller.name },
          { header: 'Email người bán', value: (l) => l.seller.email },
          { header: 'Ngày đăng', value: (l) => formatDate(l.createdAt) },
        ],
      });
    } catch { /* ignore */ }
    finally { setExporting(false); }
  };

  // Client-side filter theo title/brand/seller (nhẹ, vì backend chưa hỗ trợ search)
  const filteredRows = useMemo(() => {
    if (!result) return [];
    if (!search) return result.data;
    return result.data.filter((l) =>
      l.title.toLowerCase().includes(search)
      || l.brand.toLowerCase().includes(search)
      || l.model.toLowerCase().includes(search)
      || l.seller.name.toLowerCase().includes(search)
      || l.seller.email.toLowerCase().includes(search),
    );
  }, [result, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý tin đăng</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting || !result?.data.length}
          className="gap-2"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Xuất CSV
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tiêu đề, model, người bán…"
              className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                aria-label="Xóa tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s ? STATUS_LABEL[s] : 'Tất cả trạng thái'}</option>
            ))}
          </select>
        </div>
      </div>

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
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary inline-block" /></td></tr>
            ) : !filteredRows.length ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">Không có tin đăng nào khớp bộ lọc</td></tr>
            ) : (
              filteredRows.map((listing) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {result && (
        <Pagination
          page={page}
          totalPages={result.totalPages}
          total={result.total}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      )}
    </div>
  );
}
