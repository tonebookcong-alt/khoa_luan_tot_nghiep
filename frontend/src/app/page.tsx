import { api } from '@/lib/axios';
import { PaginatedResponse, Listing } from '@/types/api.types';
import { Hero } from '@/components/home/Hero';
import { TrustStrip } from '@/components/home/TrustStrip';
import { HotWeekGrid } from '@/components/home/HotWeekGrid';
import { FeatureBento } from '@/components/home/FeatureBento';
import { BrandRail } from '@/components/home/BrandRail';
import { StatBand } from '@/components/home/StatBand';
import { PromoStrip } from '@/components/home/PromoStrip';

async function getLatestListings(): Promise<Listing[]> {
  try {
    const res = await api.get<PaginatedResponse<Listing>>('/listings?limit=5&sort=newest');
    return res.data.data;
  } catch {
    return [];
  }
}

async function getBrandCounts(): Promise<{ counts: Record<string, number>; total: number }> {
  try {
    const res = await api.get<PaginatedResponse<Listing>>('/listings?limit=200');
    const counts: Record<string, number> = {};
    for (const l of res.data.data) {
      counts[l.brand] = (counts[l.brand] ?? 0) + 1;
    }
    return { counts, total: res.data.total ?? res.data.data.length };
  } catch {
    return { counts: {}, total: 0 };
  }
}

export default async function HomePage() {
  const [listings, brandData] = await Promise.all([
    getLatestListings(),
    getBrandCounts(),
  ]);

  return (
    <div className="pt-24 px-6 md:px-8 pb-12 max-w-7xl mx-auto">
      <Hero />
      <TrustStrip />
      <HotWeekGrid listings={listings} />
      <FeatureBento />
      <BrandRail counts={brandData.counts} />
      <StatBand totalListings={brandData.total} />
      <PromoStrip />
    </div>
  );
}
