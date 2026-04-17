'use client';
import { useEffect, useState } from 'react';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/axios';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isBanned: boolean;
  createdAt: string;
}

interface Paginated { data: UserRow[]; total: number; page: number; totalPages: number }

export default function AdminUsersPage() {
  const [result, setResult] = useState<Paginated | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = (p: number) => {
    setLoading(true);
    api.get<Paginated>(`/admin/users?page=${p}&limit=20`)
      .then((r) => { setResult(r.data); setPage(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const toggleBan = async (user: UserRow) => {
    setUpdating(user.id);
    try {
      await api.patch(`/admin/users/${user.id}`, { isBanned: !user.isBanned });
      setResult((prev) =>
        prev
          ? { ...prev, data: prev.data.map((u) => u.id === user.id ? { ...u, isBanned: !u.isBanned } : u) }
          : prev,
      );
    } catch { /* ignore */ }
    finally { setUpdating(null); }
  };

  const changeRole = async (user: UserRow, role: string) => {
    setUpdating(user.id);
    try {
      await api.patch(`/admin/users/${user.id}`, { role });
      setResult((prev) =>
        prev
          ? { ...prev, data: prev.data.map((u) => u.id === user.id ? { ...u, role } : u) }
          : prev,
      );
    } catch { /* ignore */ }
    finally { setUpdating(null); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>

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
                  {['Tên', 'Email', 'Role', 'Trạng thái', 'Tham gia', 'Hành động'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result?.data.map((user) => (
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
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                        user.isBanned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
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
                        {updating === user.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : user.isBanned ? 'Bỏ cấm' : 'Cấm'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {result && result.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>← Trước</Button>
              <span className="text-sm text-gray-500">{page} / {result.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= result.totalPages} onClick={() => load(page + 1)}>Tiếp →</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
