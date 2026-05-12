'use client';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Listing, CONDITION_LABELS } from '@/types/api.types';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { PhoneIllustration, getBrandAccents } from './PhoneIllustration';

interface HotWeekGridProps {
  listings: Listing[];
}

const CONDITION_COLOR: Record<string, string> = {
  NEW: 'text-primary',
  LIKE_NEW: 'text-emerald-600',
  GOOD: 'text-slate-500',
  FAIR: 'text-amber-600',
  POOR: 'text-red-500',
};

const TABS = ['Tất cả', 'iPhone', 'Samsung', 'Khác'] as const;

export function HotWeekGrid({ listings }: HotWeekGridProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Tất cả');

  const filtered = useMemo(() => {
    if (tab === 'Tất cả') return listings;
    if (tab === 'iPhone') return listings.filter((l) => l.brand === 'Apple');
    if (tab === 'Samsung') return listings.filter((l) => l.brand === 'Samsung');
    return listings.filter((l) => l.brand !== 'Apple' && l.brand !== 'Samsung');
  }, [listings, tab]);

  if (listings.length === 0) {
    return (
      <section className="bg-white rounded-[2rem] border border-purple-100 py-16 text-center mb-12">
        <span className="material-symbols-outlined text-5xl text-slate-200">inventory_2</span>
        <p className="mt-3 text-slate-500">Chưa có tin đăng nào. Hãy là người đầu tiên!</p>
        <Link
          href="/listings/create"
          className="inline-block mt-4 px-6 py-2.5 bg-primary text-white font-bold rounded-full text-sm hover:bg-purple-700 transition-colors"
        >
          Đăng tin ngay
        </Link>
      </section>
    );
  }

  const featured = filtered[0];
  const rest = filtered.slice(1, 5);

  return (
    <section className="mb-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">
            Hot · cập nhật real-time
          </span>
          <h2 className="font-headline font-extrabold text-2xl md:text-3xl text-[#1E1B4B] tracking-tight mt-1">
            Đang được quan tâm <span className="text-primary">tuần này</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {listings.length} tin · 48 đã giao dịch hôm nay
          </p>
        </div>
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
                tab === t
                  ? 'bg-[#1E1B4B] text-white shadow-lg shadow-[#1E1B4B]/30'
                  : 'bg-white border border-purple-100 text-slate-600 hover:border-primary/40'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-purple-100 py-12 text-center">
          <p className="text-sm text-slate-400">Không có tin đăng phù hợp với tab này</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 auto-rows-[280px]">
          {/* Featured big card */}
          {featured && <FeaturedCard listing={featured} />}

          {/* 4 cards in 2x2 */}
          {rest.map((l) => (
            <CompactCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </section>
  );
}

function FeaturedCard({ listing }: { listing: Listing }) {
  const cover = listing.images?.[0];
  const cond = CONDITION_LABELS[listing.condition] ?? 'Tốt';
  const condColor = CONDITION_COLOR[listing.condition] ?? 'text-slate-500';
  const [a1, a2] = getBrandAccents(listing.brand);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="md:col-span-1 md:row-span-2 bg-[#1E1B4B] text-white rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group"
    >
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/30 blur-[60px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-400/10 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
              color: '#451A03',
            }}
          >
            ★ Top deal
          </span>
          <span className={`text-[9px] font-black uppercase tracking-widest bg-white/10 backdrop-blur border border-white/10 px-2.5 py-1 rounded-full text-white/90`}>
            {listing.brand}
          </span>
        </div>

        {/* Phone image */}
        <div className="relative flex-1 flex items-center justify-center my-4">
          {cover ? (
            <img
              src={getImageUrl(cover.url)}
              alt={listing.title}
              className="max-h-[220px] object-contain group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <PhoneIllustration accent={a1} accent2={a2} screen="#0F172A" tilt={-4} size={180} />
          )}

          <button
            onClick={(e) => e.preventDefault()}
            className="absolute top-0 right-0 w-9 h-9 rounded-full bg-white/10 backdrop-blur text-white flex items-center justify-center hover:bg-white hover:text-red-500 transition-colors"
          >
            <span className="material-symbols-outlined text-base">favorite</span>
          </button>
        </div>

        <div>
          <p className="font-bold text-sm leading-tight text-white/90 line-clamp-2 mb-3">
            {listing.title}
          </p>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                Giá đề xuất
              </div>
              <div className="font-headline font-black text-2xl text-white tracking-tighter">
                {formatPrice(listing.askingPrice)}
              </div>
              <div className={`text-[10px] font-bold mt-1 ${condColor.replace('text-', 'text-')} text-white/80`}>
                Tình trạng: {cond}
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/40 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined">arrow_forward</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CompactCard({ listing }: { listing: Listing }) {
  const cover = listing.images?.[0];
  const cond = CONDITION_LABELS[listing.condition] ?? 'Tốt';
  const condColor = CONDITION_COLOR[listing.condition] ?? 'text-slate-500';
  const [a1, a2] = getBrandAccents(listing.brand);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="bg-white rounded-[1.5rem] p-4 border border-purple-50 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all group flex flex-col"
    >
      <div className="relative flex-1 bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center mb-3">
        {cover ? (
          <img
            src={getImageUrl(cover.url)}
            alt={listing.title}
            className="max-h-[140px] object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <PhoneIllustration accent={a1} accent2={a2} tilt={-3} size={100} />
        )}

        <span
          className={`absolute top-2 left-2 text-[9px] font-black uppercase tracking-widest bg-white/95 backdrop-blur border border-purple-100 px-2 py-1 rounded-full ${condColor}`}
        >
          {cond}
        </span>
        {listing.images.length > 1 && (
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined text-[10px]">photo_library</span>
            {listing.images.length}
          </span>
        )}
      </div>

      <div>
        <p className="font-bold text-xs leading-tight text-slate-900 line-clamp-2 mb-2">
          {listing.title}
        </p>
        <div className="flex items-center justify-between">
          <span className="font-headline font-black text-base text-[#1E1B4B] tracking-tight">
            {formatPrice(listing.askingPrice)}
          </span>
          <span className="text-[10px] text-slate-400">{listing.brand}</span>
        </div>
      </div>
    </Link>
  );
}
