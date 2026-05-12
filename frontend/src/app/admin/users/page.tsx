'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, Search, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { api } from '@/lib/axios';
import { formatDate } from '@/lib/utils';
import { exportCsv } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/Pagination';

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isBanned: boolean;
  createdAt: string;
}

interface Paginated {
  data: UserRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PAGE_SIZE = 10;
type StatusFilter = '' | 'active' | 'banned';

export default function AdminUsersPage() {
  const [result, setResult] = useState<Paginated | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Debounce search input → search state (300ms)
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(PAGE_SIZE));
    if (search) p.set('search', search);
    if (status) p.set('status', status);
    if (role) p.set('role', role);
    return p.toString();
  }, [page, search, status, role]);

  useEffect(() => {
    setLoading(true);
    api
      .get<Paginated>(`/admin/users?${queryString}`)
      .then((r) => setResult(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [queryString]);

  const toggleBan = async (user: UserRow) => {
    setUpdating(user.id);
    try {
      await api.patch(`/admin/users/${user.id}`, { isBanned: !user.isBanned });
      setResult((prev) =>
        prev
          ? { ...prev, data: prev.data.map((u) => (u.id === user.id ? { ...u, isBanned: !u.isBanned } : u)) }
          : prev,
      );
    } catch {
      /* ignore */
    } finally {
      setUpdating(null);
    }
  };

  const changeRole = async (user: UserRow, newRole: string) => {
    setUpdating(user.id);
    try {
      await api.patch(`/admin/users/${user.id}`, { role: newRole });
      setResult((prev) =>
        prev
          ? { ...prev, data: prev.data.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)) }
          : prev,
      );
    } catch {
      /* ignore */
    } finally {
      setUpdating(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Lấy tối đa 10.000 user khớp filter hiện tại
      const p = new URLSearchParams();
      p.set('page', '1');
      p.set('limit', '10000');
      if (search) p.set('search', search);
      if (status) p.set('status', status);
      if (role) p.set('role', role);
      const r = await api.get<Paginated>(`/admin/users?${p.toString()}`);
      exportCsv<UserRow>({
        filename: 'nguoi-dung',
        rows: r.data.data,
        columns: [
          { header: 'ID', value: (u) => u.id },
          { header: 'Tên', value: (u) => u.name },
          { header: 'Email', value: (u) => u.email },
          { header: 'SĐT', value: (u) => u.phone ?? '' },
          { header: 'Vai trò', value: (u) => u.role },
          { header: 'Trạng thái', value: (u) => (u.isBanned ? 'Bị cấm' : 'Hoạt động') },
          { header: 'Ngày tham gia', value: (u) => formatDate(u.createdAt) },
        ],
      });
    } catch {
      /* ignore */
    } finally {
      setExporting(false);
    }
  };

  const hasFilter = !!(search || status || role);
  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setRole('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
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

      {/* Search + Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tên, email, SĐT…"
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
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter);
              setPage(1);
            }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="banned">Bị cấm</option>
          </select>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Tất cả vai trò</option>
            <option value="BUYER">Buyer</option>
            <option value="SELLER">Seller</option>
            <option value="ADMIN">Admin</option>
          </select>
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-gray-500">
              <X className="h-3.5 w-3.5" />
              Xóa lọc
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              {['Tên', 'Email', 'Role', 'Trạng thái', 'Tham gia', 'Hành động'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary inline-block" />
                </td>
              </tr>
            ) : !result?.data.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                  Không tìm thấy người dùng nào khớp bộ lọc
                </td>
              </tr>
            ) : (
              result.data.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-gray-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user, e.target.value)}
                      disabled={updating === user.id}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white disabled:opacity-50"
                    >
                      <option value="BUYER">BUYER</option>
                      <option value="SELLER">SELLER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                        user.isBanned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {user.isBanned ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                      {user.isBanned ? 'Bị cấm' : 'Hoạt động'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant={user.isBanned ? 'outline' : 'destructive'}
                      onClick={() => toggleBan(user)}
                      disabled={updating === user.id}
                      className="text-xs h-7"
                    >
                      {updating === user.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : user.isBanned ? (
                        'Bỏ cấm'
                      ) : (
                        'Cấm'
                      )}
                    </Button>
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
