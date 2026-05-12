'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Phone, MessageCircle, Loader2, Pencil, BadgeInfo } from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/auth.store';
import { Listing } from '@/types/api.types';
import { getImageUrl, formatDate } from '@/lib/utils';

const SUGGESTIONS = [
  'Điện thoại này còn không?',
  'Bạn có ship hàng không?',
  'Sản phẩm còn bảo hành không?',
  'Giá có thương lượng không?',
];

interface Props {
  listing: Listing;
}

export function ListingContactPanel({ listing }: Props) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const isSelf = mounted && user?.id === listing.seller.id;
  const authed = mounted && isAuthenticated();

  const extractError = (err: unknown): { status?: number; message: string } => {
    const e = err as { response?: { status?: number; data?: { message?: unknown } }; message?: string };
    const status = e?.response?.status;
    const raw = e?.response?.data?.message;
    let message: string;
    if (typeof raw === 'string') message = raw;
    else if (Array.isArray(raw) && typeof raw[0] === 'string') message = raw[0];
    else if (typeof e?.message === 'string') message = e.message;
    else message = 'Đã xảy ra lỗi';
    return { status, message };
  };

  const handleContact = async (msg?: string) => {
    if (!authed) { router.push('/login'); return; }
    setLoading(true);
    setError('');
    let convId: string | null = null;

    // Bước 1: tạo / lấy conversation
    try {
      const res = await api.post<{ id: string }>('/conversations', { listingId: listing.id });
      convId = res.data.id;
    } catch (err: unknown) {
      const existingId = (err as { response?: { data?: { conversationId?: string } } })
        ?.response?.data?.conversationId;
      if (existingId) {
        // Conversation đã tồn tại (409) — dùng id cũ
        convId = existingId;
      } else {
        const { status, message } = extractError(err);
        setLoading(false);
        if (status === 401) { router.push('/login'); return; }
        if (status === 400 && message.includes('chính mình')) {
          setError('Đây là tin của bạn, không thể tự nhắn.');
        } else if (status === 404) {
          setError('Tin đăng không còn tồn tại.');
        } else {
          setError(message || 'Không tạo được cuộc trò chuyện.');
        }
        return;
      }
    }

    // Bước 2: gửi tin nhắn (nếu có)
    if (msg?.trim() && convId) {
      try {
        await api.post(`/conversations/${convId}/messages`, { content: msg.trim() });
      } catch (err: unknown) {
        const { status, message } = extractError(err);
        setLoading(false);
        if (status === 401) { router.push('/login'); return; }
        if (status === 403) {
          setError(message.includes('chặn') ? 'Bạn và người bán đã chặn nhau, không thể nhắn tin.' : 'Bạn không có quyền nhắn trong cuộc trò chuyện này.');
        } else {
          setError(message || 'Gửi tin nhắn thất bại.');
        }
        return;
      }
    }

    setLoading(false);
    router.push(`/dashboard/messages?conversationId=${convId}`);
  };

  const handleSuggestion = (s: string) => {
    if (!authed) { router.push('/login'); return; }
    setMessage(s);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-3">
      {/* Self-listing banner */}
      {mounted && isSelf && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <BadgeInfo className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-amber-900">Đây là tin đăng của bạn</p>
            <p className="text-xs text-amber-700/80 mt-0.5">Bạn không thể tự nhắn tin cho chính mình.</p>
          </div>
          <Link
            href={`/dashboard/listings`}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-2 text-xs font-bold text-white transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Quản lý tin
          </Link>
        </div>
      )}

      {/* Phone + Chat buttons */}
      {mounted && !isSelf && (
        <div className={`grid gap-3 ${listing.seller.phone ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {listing.seller.phone && (
            <a
              href={`tel:${listing.seller.phone}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 hover:border-primary hover:text-primary transition-colors"
            >
              <Phone className="h-4 w-4" />
              {listing.seller.phone}
            </a>
          )}
          <button
            onClick={() => handleContact()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-purple-700 py-3 text-sm font-bold text-white transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            Nhắn tin người bán
          </button>
        </div>
      )}

      {/* Seller card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/users/${listing.seller.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0">
            {listing.seller.avatar ? (
              <img
                src={getImageUrl(listing.seller.avatar)}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-100"
                alt={listing.seller.name}
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold ring-2 ring-gray-100">
                {listing.seller.name[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-gray-900 truncate">{listing.seller.name}</p>
              {listing.seller.createdAt && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
                  Tham gia {formatDate(listing.seller.createdAt)}
                </p>
              )}
            </div>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            {mounted && !isSelf && (
              <button
                onClick={() => handleContact()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-purple-700 px-3 py-1.5 text-xs font-bold text-white transition-colors disabled:opacity-60"
                title="Nhắn tin với người bán"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                Chat
              </button>
            )}
            <Link
              href={`/users/${listing.seller.id}`}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary transition-colors"
            >
              Xem trang
            </Link>
          </div>
        </div>
      </div>

      {/* Quick message input */}
      {mounted && !isSelf && (
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
          {authed ? (
            <>
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setError(''); }}
                  placeholder="Nhắn hỏi mua hàng..."
                  className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && message.trim() && !loading) {
                      e.preventDefault();
                      handleContact(message);
                    }
                  }}
                />
                <button
                  onClick={() => { if (message.trim()) handleContact(message); }}
                  disabled={!message.trim() || loading}
                  className="h-9 w-14 rounded-xl bg-primary hover:bg-purple-700 text-xs font-bold text-white transition-colors disabled:opacity-40 flex items-center justify-center"
                >
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Gửi'}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-xs text-red-500">{error}</p>
              )}
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="shrink-0 rounded-full border border-gray-200 px-3 py-1.5 text-[11px] text-gray-600 hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="w-full py-2.5 rounded-xl border border-dashed border-purple-200 bg-purple-50 text-sm font-semibold text-primary hover:bg-purple-100 transition-colors"
            >
              Đăng nhập để gửi tin nhắn
            </button>
          )}
        </div>
      )}

      {/* Sticky floating Chat FAB — luôn hiển thị góc phải dưới khi cuộn trang */}
      {mounted && !isSelf && (
        <button
          onClick={() => handleContact()}
          disabled={loading}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary hover:bg-purple-700 text-white px-5 py-3.5 shadow-2xl shadow-primary/40 hover:shadow-primary/60 transition-all hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
          title="Nhắn tin với người bán"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <MessageCircle className="h-5 w-5" />
          )}
          <span className="font-bold text-sm hidden sm:inline">Nhắn người bán</span>
        </button>
      )}
    </div>
  );
}
