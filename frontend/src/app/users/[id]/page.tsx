import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Calendar, Package } from 'lucide-react';
import { api } from '@/lib/axios';
import { User, Listing, PaginatedResponse } from '@/types/api.types';
import { formatDate, formatPrice, getImageUrl } from '@/lib/utils';
import { ContactSellerButton } from '@/components/listings/ContactSellerButton';

async function getUser(id: string): Promise<User | null> {
  try {
    const res = await api.get<User>(`/users/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

async function getUserListings(id: string): Promise<Listing[]> {
  try {
    const res = await api.get<PaginatedResponse<Listing>>(`/listings?sellerId=${id}&limit=20`);
    return res.data.data;
  } catch {
    return [];
  }
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [seller, listings] = await Promise.all([getUser(id), getUserListings(id)]);
  if (!seller) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 pt-24 pb-12">

      {/* ── Profile card ── */}
      <div className="rounded-3xl border border-purple-100 bg-white p-8 shadow-sm mb-8">
        <div className="flex items-center gap-6">
          {seller.avatar ? (
            <img
              src={getImageUrl(seller.avatar)}
              alt={seller.name}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-purple-50"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold ring-4 ring-purple-50">
              {seller.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-slate-900 font-headline">{seller.name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
              {seller.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-blue-400 shrink-0" />
                  {seller.address}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-300 shrink-0" />
                Tham gia {formatDate(seller.createdAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-slate-300 shrink-0" />
                {listings.length} tin đăng
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Listings ── */}
      <h2 className="text-lg font-extrabold text-slate-900 font-headline mb-4">
        Tin đăng đang bán
      </h2>

      {listings.length === 0 ? (
        <div className="rounded-3xl border border-purple-100 bg-white p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">inventory_2</span>
          <p className="text-slate-400 text-sm">Người dùng này chưa có tin đăng nào.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const cover = listing.images?.[0]?.url;
            return (
              <div key={listing.id} className="rounded-2xl border border-purple-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <Link href={`/listings/${listing.id}`}>
                  <div className="relative h-44 bg-slate-50 overflow-hidden">
                    {cover ? (
                      <img
                        src={getImageUrl(cover)}
                        alt={listing.title}
                        className="w-full h-full object-contain p-3 hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                        <span className="material-symbols-outlined text-5xl">smartphone</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1">
                    <h3 className="font-bold text-sm text-slate-900 line-clamp-2 mb-1">{listing.title}</h3>
                    <p className="text-lg font-black text-primary">{formatPrice(listing.askingPrice)}</p>
                    {listing.location && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {listing.location}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="px-4 pb-4">
                  <ContactSellerButton listingId={listing.id} sellerId={seller.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
