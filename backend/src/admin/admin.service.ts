import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListingStatus, TransactionStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ── KPI tổng quan ──────────────────────────────────────────────────

  async getStats() {
    const [totalUsers, totalListings, totalTransactions, commissionAgg] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.listing.count(),
        this.prisma.transaction.count(),
        this.prisma.transaction.aggregate({
          where: { status: TransactionStatus.COMPLETED },
          _sum: { commission: true, amount: true },
        }),
      ]);

    const [listingsByStatus, transactionsByStatus] = await Promise.all([
      this.prisma.listing.groupBy({ by: ['status'], _count: true }),
      this.prisma.transaction.groupBy({ by: ['status'], _count: true }),
    ]);

    return {
      totalUsers,
      totalListings,
      totalTransactions,
      totalRevenue: commissionAgg._sum.amount ?? 0,
      totalCommission: commissionAgg._sum.commission ?? 0,
      listingsByStatus: Object.fromEntries(
        listingsByStatus.map((r) => [r.status, r._count]),
      ),
      transactionsByStatus: Object.fromEntries(
        transactionsByStatus.map((r) => [r.status, r._count]),
      ),
    };
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

  // ── Doanh thu hoa hồng theo tháng ──────────────────────────────────

  async getCommissionByMonth() {
    // Raw query để group by tháng
    const rows = await this.prisma.$queryRaw<
      { month: string; commission: number; count: bigint }[]
    >`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM') AS month,
        SUM(commission)::int            AS commission,
        COUNT(*)                        AS count
      FROM "Transaction"
      WHERE status = 'COMPLETED'
      GROUP BY month
      ORDER BY month ASC
      LIMIT 12
    `;

    return rows.map((r) => ({
      month: r.month,
      commission: r.commission,
      count: Number(r.count),
    }));
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

  // ── Transactions management ─────────────────────────────────────────

  async getTransactions(page = 1, limit = 20, status?: TransactionStatus) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          commission: true,
          status: true,
          vnpayRef: true,
          createdAt: true,
          listing: { select: { id: true, title: true } },
          buyer: { select: { id: true, name: true } },
          seller: { select: { id: true, name: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
