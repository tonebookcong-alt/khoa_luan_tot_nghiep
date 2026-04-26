'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Phone, MessageCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/auth.store';
import { Listing } from '@/types/api.types';
import { getImageUrl, formatDate } from '@/lib/utils';
import { BuyNowButton } from './BuyNowButton';

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

  const handleContact = async (msg?: string) => {
    if (!authed) { router.push('/login'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{ id: string }>('/conversations', { listingId: listing.id });
      const convId = res.data.id;
      if (msg?.trim()) {
        await api.post(`/conversations/${convId}/messages`, { content: msg.trim() });
      }
      router.push(`/dashboard/messages?conversationId=${convId}`);
    } catch (err: unknown) {
      const convId = (err as { response?: { data?: { conversationId?: string } } })
        ?.response?.data?.conversationId;
      if (convId) {
        if (msg?.trim()) {
          try { await api.post(`/conversations/${convId}/messages`, { content: msg.trim() }); } catch { /* ignore */ }
        }
        router.push(`/dashboard/messages?conversationId=${convId}`);
        return;
      }
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        router.push('/login');
      } else {
        setError('Không thể gửi tin nhắn. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (s: string) => {
    if (!authed) { router.push('/login'); return; }
    setMessage(s);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-3">
      {/* Phone + Chat buttons */}
      {mounted && !isSelf && (
        <div className="grid grid-cols-2 gap-3">
          {listing.seller.phone ? (
            <a
              href={`tel:${listing.seller.phone}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 hover:border-primary hover:text-primary transition-colors"
            >
              <Phone className="h-4 w-4" />
              {listing.seller.phone}
            </a>
          ) : (
            <BuyNowButton
              listingId={listing.id}
              sellerId={listing.seller.id}
              listingStatus={listing.status}
            />
          )}
          <button
            onClick={() => handleContact()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-purple-700 py-3 text-sm font-bold text-white transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            Chat
          </button>
        </div>
      )}

      {/* Seller card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <Link href={`/users/${listing.seller.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
            <div>
              <p className="font-bold text-gray-900">{listing.seller.name}</p>
              {listing.seller.createdAt && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
                  Tham gia {formatDate(listing.seller.createdAt)}
                </p>
              )}
            </div>
          </Link>
          <Link
            href={`/users/${listing.seller.id}`}
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary transition-colors"
          >
            Xem trang
          </Link>
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
    </div>
  );
}
