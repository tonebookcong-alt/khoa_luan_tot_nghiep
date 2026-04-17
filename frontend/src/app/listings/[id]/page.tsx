import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, ShieldCheck, User, Calendar } from 'lucide-react';
import { api } from '@/lib/axios';
import { Listing, CONDITION_LABELS } from '@/types/api.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, formatDate, getImageUrl } from '@/lib/utils';
import { ListingImageGallery } from '@/components/listings/ListingImageGallery';
import { ContactSellerButton } from '@/components/listings/ContactSellerButton';
import { BuyNowButton } from '@/components/listings/BuyNowButton';

async function getListing(id: string): Promise<Listing | null> {
  try {
    const res = await api.get<Listing>(`/listings/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left: Images + Info */}
        <div className="lg:col-span-2 space-y-6">
          <ListingImageGallery images={listing.images} title={listing.title} />

          {/* Details */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-xl font-bold text-gray-900">{listing.title}</h1>
              <Badge variant="success">{CONDITION_LABELS[listing.condition]}</Badge>
            </div>

            <p className="mt-2 text-3xl font-bold text-blue-600">{formatPrice(listing.askingPrice)}</p>

            {listing.aiPriceResult && (
              <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Định giá AI</p>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Giá thị trường: <span className="font-medium">{formatPrice(listing.aiPriceResult.P_market)}</span></p>
                    <p className="text-sm text-gray-600">Giá đề xuất: <span className="font-bold text-blue-700">{formatPrice(listing.aiPriceResult.P_final)}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Độ tin cậy</p>
                    <p className="text-lg font-bold text-green-600">
                      {Math.round(listing.aiPriceResult.confidenceScore * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            <hr className="my-4" />

            {/* Specs */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Thương hiệu:</span> <span className="font-medium">{listing.brand}</span></div>
              <div><span className="text-gray-500">Model:</span> <span className="font-medium">{listing.model}</span></div>
              {listing.storage && <div><span className="text-gray-500">Bộ nhớ:</span> <span className="font-medium">{listing.storage}</span></div>}
              {listing.color && <div><span className="text-gray-500">Màu sắc:</span> <span className="font-medium">{listing.color}</span></div>}
              <div><span className="text-gray-500">Danh mục:</span> <span className="font-medium">{listing.category.name}</span></div>
              <div><span className="text-gray-500">Đăng ngày:</span> <span className="font-medium">{formatDate(listing.createdAt)}</span></div>
            </div>

            <hr className="my-4" />

            <div>
              <h2 className="font-semibold text-gray-900">Mô tả</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{listing.description}</p>
            </div>
          </div>
        </div>

        {/* Right: Seller + Actions */}
        <div className="space-y-4">
          {/* Seller card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-semibold text-gray-900">Thông tin người bán</h2>
            <Link href={`/users/${listing.seller.id}`} className="flex items-center gap-3 hover:opacity-80">
              {listing.seller.avatar ? (
                <img src={listing.seller.avatar} alt={listing.seller.name} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{listing.seller.name}</p>
                {listing.seller.createdAt && (
                  <p className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    Tham gia {formatDate(listing.seller.createdAt)}
                  </p>
                )}
              </div>
            </Link>

            <div className="mt-4 space-y-2">
              <BuyNowButton listingId={listing.id} sellerId={listing.seller.id} listingStatus={listing.status} />
              <ContactSellerButton listingId={listing.id} sellerId={listing.seller.id} />
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/users/${listing.seller.id}`}>Xem trang người bán</Link>
              </Button>
            </div>
          </div>

          {/* Safety note */}
          <div className="rounded-xl bg-green-50 border border-green-100 p-4">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800">Thanh toán an toàn</p>
                <p className="mt-1 text-xs text-green-700">
                  Dùng thanh toán VNPAY Escrow để tiền được bảo vệ cho đến khi bạn nhận máy và xác nhận.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
