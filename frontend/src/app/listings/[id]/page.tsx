import { notFound } from 'next/navigation';
import { MapPin, Clock, Info } from 'lucide-react';
import { api } from '@/lib/axios';
import { Listing, CONDITION_LABELS, AiPriceResult, DeviceCondition } from '@/types/api.types';
import { Badge } from '@/components/ui/badge';

const CONDITION_VARIANT: Record<DeviceCondition, 'success' | 'default' | 'warning' | 'destructive'> = {
  NEW: 'success',
  LIKE_NEW: 'success',
  GOOD: 'default',
  FAIR: 'warning',
  POOR: 'destructive',
};
import { formatPrice, formatDate, getImageUrl } from '@/lib/utils';
import { ListingImageGallery } from '@/components/listings/ListingImageGallery';
import { ListingContactPanel } from '@/components/listings/ListingContactPanel';
import { SaveButton } from '@/components/listings/SaveButton';
import { AiPricingResult } from '@/components/listings/AiPricingResult';

async function getListing(id: string): Promise<Listing | null> {
  try {
    const res = await api.get<Listing>(`/listings/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

function formatShortPrice(price: number): string {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1).replace(/\.0$/, '')} tr`;
  if (price >= 1_000)     return `${Math.round(price / 1_000)} nghìn`;
  return `${price}đ`;
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-semibold text-gray-700">{value}</span>
    </div>
  );
}

function MarketPriceRange({ askingPrice, aiResult }: { askingPrice: number; aiResult: AiPriceResult }) {
  const pFinal = aiResult.pFinal ?? aiResult.P_final ?? askingPrice;
  const low  = aiResult.priceRange?.low  ?? pFinal * 0.85;
  const high = aiResult.priceRange?.high ?? pFinal * 1.15;
  const pct  = Math.min(Math.max(((askingPrice - low) / (high - low)) * 100, 2), 98);

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">Khoảng giá thị trường</span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Info className="h-3 w-3" /> Theo dữ liệu trong 3 tháng gần nhất
        </span>
      </div>
      <div className="relative pt-5">
        {/* Price pill marker */}
        <div
          className="absolute -top-0 -translate-x-1/2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap"
          style={{ left: `${pct}%` }}
        >
          {formatShortPrice(askingPrice)}
        </div>
        {/* Track */}
        <div className="h-2 w-full rounded-full bg-blue-200">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
        </div>
        {/* Range labels */}
        <div className="mt-1.5 flex justify-between text-[10px] font-medium text-gray-400">
          <span>{formatShortPrice(low)}</span>
          <span>{formatShortPrice(high)}</span>
        </div>
      </div>
    </div>
  );
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 pt-24 pb-12">
      <div className="rounded-3xl border border-purple-100 bg-white/85 backdrop-blur-sm p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)] items-start">

        {/* ── LEFT: Gallery + Specs ── */}
        <div className="space-y-4 min-w-0">
          <ListingImageGallery images={listing.images} title={listing.title} />

          {/* Specs */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Thông số</h3>
            <SpecRow label="Thương hiệu" value={listing.brand} />
            <SpecRow label="Model" value={listing.model} />
            {listing.storage  && <SpecRow label="Bộ nhớ"    value={listing.storage} />}
            {listing.color    && <SpecRow label="Màu sắc"   value={listing.color} />}
            {listing.category && <SpecRow label="Danh mục"  value={listing.category.name} />}
            <SpecRow label="Tình trạng" value={CONDITION_LABELS[listing.condition]} />
            <SpecRow label="Đăng ngày"  value={formatDate(listing.createdAt)} />
          </div>
        </div>

        {/* ── RIGHT: Info + Contact ── */}
        <div className="space-y-4 min-w-0">

          {/* Title + Save */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1 text-xs text-gray-400">
                {listing.brand}
                {listing.category && ` · ${listing.category.name}`}
              </p>
              <h1 className="text-xl font-bold leading-snug text-gray-900 break-words">{listing.title}</h1>
              <div className="mt-1.5">
                <Badge variant={CONDITION_VARIANT[listing.condition]}>{CONDITION_LABELS[listing.condition]}</Badge>
              </div>
            </div>
            <SaveButton listingId={listing.id} />
          </div>

          {/* Price */}
          <p className="text-3xl font-black text-red-500">{formatPrice(listing.askingPrice)}</p>

          {/* Location + Time */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            {listing.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-blue-400" />
                {listing.location}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 shrink-0 text-gray-300" />
              Cập nhật {formatDate(listing.updatedAt ?? listing.createdAt)}
            </span>
          </div>

          {/* Market price range (AI) */}
          {listing.aiPriceResult && (
            <MarketPriceRange
              askingPrice={listing.askingPrice}
              aiResult={listing.aiPriceResult}
            />
          )}

          {/* Contact panel (client) */}
          <ListingContactPanel listing={listing} />

          {/* Description */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Mô tả</h2>
            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-gray-600">
              {listing.description}
            </p>
          </div>

          {/* Full AI Pricing Analysis (read-only) */}
          {listing.aiPriceResult && (listing.aiPriceResult.pFinal ?? listing.aiPriceResult.P_final) ? (
            <AiPricingResult
              data={normalizeAiResult(listing.aiPriceResult)}
              imageUrls={listing.images.map((img) => getImageUrl(img.url))}
              readOnly
            />
          ) : null}
        </div>
      </div>
      </div>
    </div>
  );
}

/**
 * Tin đăng cũ có thể lưu schema {P_market, P_final, ...}; tin mới lưu {pMarket, pFinal, ...}.
 * Chuẩn hoá để AiPricingResult component đọc field camelCase.
 */
function normalizeAiResult(r: AiPriceResult): Parameters<typeof AiPricingResult>[0]['data'] {
  return {
    pMarket: r.pMarket ?? r.P_market ?? 0,
    pFinal: r.pFinal ?? r.P_final ?? 0,
    priceRange: r.priceRange,
    damageBreakdown: (r.damageBreakdown ?? []).map((d) => ({
      part: d.part,
      severity: d.severity,
      weight: d.weight,
      description: d.description ?? '',
      deductionPercent: d.deductionPercent ?? Math.round(d.weight * d.severity * 1000) / 10,
    })),
    confidenceScore: r.confidenceScore,
    detectedModel: r.detectedModel ?? '',
    overallCondition: r.overallCondition ?? '',
    summary: r.summary ?? '',
    marketSummary: r.marketSummary ?? '',
    dataPoints: r.dataPoints ?? 0,
    detectedGeneration: r.detectedGeneration,
    claimedModel: r.claimedModel,
    claimedMatches: r.claimedMatches,
    damageDetections: r.damageDetections,
    images: r.images,
  };
}
