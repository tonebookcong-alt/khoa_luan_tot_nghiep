import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListingStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ── KPI tổng quan ──────────────────────────────────────────────────

  async getStats() {
    const [totalUsers, totalListings, listingsByStatus] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.count(),
      this.prisma.listing.groupBy({ by: ['status'], _count: true }),
    ]);

    return {
      totalUsers,
      totalListings,
      listingsByStatus: Object.fromEntries(
        listingsByStatus.map((r) => [r.status, r._count]),
      ),
    };
  }

  // ── Tin đăng & user mới theo ngày (7 ngày gần nhất) ────────────────

  async getDailyStats(days = 7) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const [listings, users] = await Promise.all([
      this.prisma.listing.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
    ]);

    const buckets: Record<string, { listings: number; users: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { listings: 0, users: 0 };
    }
    for (const r of listings) {
      const k = r.createdAt.toISOString().slice(0, 10);
      if (buckets[k]) buckets[k].listings++;
    }
    for (const r of users) {
      const k = r.createdAt.toISOString().slice(0, 10);
      if (buckets[k]) buckets[k].users++;
    }

    return Object.entries(buckets).map(([date, v]) => ({
      date,
      listings: v.listings,
      users: v.users,
    }));
  }

  // ── Biến động giá theo model ────────────────────────────────────────

  async getPriceHistory(model?: string, brand?: string) {
    return this.prisma.priceHistory.findMany({
      where: {
        ...(model ? { model: { contains: model, mode: 'insensitive' } } : {}),
        ...(brand ? { brand: { contains: brand, mode: 'insensitive' } } : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: 90,
      select: {
        id: true,
        brand: true,
        model: true,
        price: true,
        source: true,
        recordedAt: true,
      },
    });
  }

  // ── Listings management ─────────────────────────────────────────────

  async getListings(page = 1, limit = 20, status?: ListingStatus) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          brand: true,
          model: true,
          askingPrice: true,
          status: true,
          condition: true,
          createdAt: true,
          seller: { select: { id: true, name: true, email: true } },
          images: { select: { url: true }, take: 1 },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateListingStatus(id: string, status: ListingStatus) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Tin đăng không tồn tại');
    return this.prisma.listing.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, title: true },
    });
  }
}
