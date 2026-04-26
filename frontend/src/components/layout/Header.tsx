'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/axios';

export function Header() {
  const { user, logout, isAuthenticated } = useAuthStore();
  // Prevent hydration mismatch: chỉ render auth UI sau khi client mount
  const [mounted, setMounted] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    api.get<{ unreadCount: number }[]>('/conversations')
      .then((r) => setTotalUnread(r.data.reduce((s, c) => s + (c.unreadCount ?? 0), 0)))
      .catch(() => {});
  }, [mounted, isAuthenticated]);
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      router.push(`/listings?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    setShowDropdown(false);
    router.push('/');
  };

  return (
    <nav className="fixed top-0 w-full z-50 px-8 py-4 glass-nav border-b border-purple-100 flex items-center justify-between">
      {/* Left: Logo + Search */}
      <div className="flex items-center gap-12">
        <Link href="/" className="text-3xl font-extrabold tracking-tighter text-black font-headline">
          Phone<span className="text-primary">Market</span>
        </Link>

        <div className="relative w-96 hidden md:block">
          <input
            className="w-full bg-slate-100 border-none rounded-full pl-12 pr-6 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            placeholder="Tìm kiếm điện thoại..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearch}
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
            search
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-8">
        {mounted && isAuthenticated() ? (
          <>
            <div className="flex items-center gap-6">
              <Link href="/dashboard/listings" className="flex flex-col items-center gap-0.5 text-slate-600 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">package_2</span>
                <span className="text-[10px] font-bold uppercase tracking-tighter">Tin đăng</span>
              </Link>
              <Link href="/dashboard/messages" className="relative flex flex-col items-center gap-0.5 text-slate-600 hover:text-primary transition-colors px-1 py-0.5">
                <span className="material-symbols-outlined pointer-events-none">chat_bubble</span>
                {totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none pointer-events-none">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
                <span className="text-[10px] font-bold uppercase tracking-tighter pointer-events-none">Tin nhắn</span>
              </Link>
              <Link href="/listings/create" className="relative flex flex-col items-center gap-0.5 text-slate-600 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">add_circle</span>
                <span className="text-[10px] font-bold uppercase tracking-tighter">Đăng bán</span>
              </Link>
            </div>

            {/* Avatar + Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm cursor-pointer focus:outline-none"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-purple-100 shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="font-semibold text-sm truncate">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-primary-light hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">person</span>
                    Hồ sơ cá nhân
                  </Link>
                  <Link
                    href="/dashboard/listings"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-primary-light hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">dashboard</span>
                    Quản lý tin đăng
                  </Link>
                  {user?.role === 'ADMIN' && (
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-purple-700 hover:bg-purple-50 transition-colors font-medium"
                    >
                      <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                      Admin Dashboard
                    </Link>
                  )}
                  <hr className="border-slate-100" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </>
        ) : mounted ? (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary-light rounded-full transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 text-sm font-bold text-white bg-primary rounded-full hover:bg-purple-700 transition-colors shadow-lg shadow-primary/20"
            >
              Đăng ký
            </Link>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
