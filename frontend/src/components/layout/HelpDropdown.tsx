'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/auth.store';
import { getImageUrl } from '@/lib/utils';

interface AdminEntry {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
}

export function HelpDropdown() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [admins, setAdmins] = useState<AdminEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleToggle = () => {
    if (!isAuthenticated()) {
      router.push('/login?redirect=/dashboard/messages');
      return;
    }
    setOpen((v) => !v);
    if (admins === null && !loading) {
      setLoading(true);
      api.get<AdminEntry[]>('/users/admins')
        .then((r) => setAdmins(r.data))
        .catch(() => setAdmins([]))
        .finally(() => setLoading(false));
    }
  };

  const handlePickAdmin = async (adminId: string) => {
    if (creating) return;
    setCreating(adminId);
    setError(null);
    try {
      const r = await api.post<{ id: string }>('/conversations/support', { adminId });
      setOpen(false);
      router.push(`/dashboard/messages?conversationId=${r.data.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Không thể bắt đầu trò chuyện');
    } finally {
      setCreating(null);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold text-slate-600 hover:text-primary transition-colors"
      >
        Hỗ trợ
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-purple-100 shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="font-bold text-sm text-slate-900">Liên hệ hỗ trợ</p>
            <p className="text-xs text-slate-500 mt-0.5">Chọn quản trị viên để bắt đầu trò chuyện</p>
          </div>

          {error && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : !admins || admins.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8 px-4">
              Chưa có quản trị viên khả dụng.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {admins.map((admin) => (
                <li key={admin.id}>
                  <button
                    onClick={() => handlePickAdmin(admin.id)}
                    disabled={creating !== null}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-light transition-colors text-left disabled:opacity-50"
                  >
                    <div className="relative flex-shrink-0">
                      {admin.avatar ? (
                        <img src={getImageUrl(admin.avatar)} alt={admin.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {admin.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                          admin.isOnline ? 'bg-green-500' : 'bg-slate-300'
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{admin.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {admin.isOnline ? (
                          <span className="text-green-600 font-medium">Đang trực tuyến</span>
                        ) : (
                          'Ngoại tuyến · Trả lời trong 24h'
                        )}
                      </p>
                    </div>
                    {creating === admin.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
