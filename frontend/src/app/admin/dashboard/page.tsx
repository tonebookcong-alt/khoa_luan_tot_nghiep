'use client';
import { useEffect, useState } from 'react';
import { Users, ListChecks, CreditCard, TrendingUp, Loader2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '@/lib/axios';
import { formatPrice } from '@/lib/utils';

interface Stats {
  totalUsers: number;
  totalListings: number;
  totalTransactions: number;
  totalRevenue: number;
  totalCommission: number;
  listingsByStatus: Record<string, number>;
  transactionsByStatus: Record<string, number>;
}

interface CommissionMonth { month: string; commission: number; count: number }
interface PricePoint { recordedAt: string; price: number; model: string; brand: string }

const LISTING_STATUS_VN: Record<string, string> = {
  ACTIVE: 'Đang bán',
  DRAFT: 'Nháp',
  SOLD: 'Đã bán',
  REMOVED: 'Đã xóa',
  RESERVED: 'Đã đặt',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [commission, setCommission] = useState<CommissionMonth[]>([]);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Stats>('/admin/stats'),
      api.get<CommissionMonth[]>('/admin/stats/commission'),
      api.get<PricePoint[]>('/admin/stats/price-history'),
    ])
      .then(([s, c, p]) => {
        setStats(s.data);
        setCommission(c.data);
        setPriceHistory(
          p.data
            .slice(0, 30)
            .map((r) => ({ ...r, recordedAt: r.recordedAt.slice(0, 10) }))
            .reverse(),
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpis = [
    { label: 'Tổng người dùng', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Tổng tin đăng', value: stats?.totalListings ?? 0, icon: ListChecks, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Tổng giao dịch', value: stats?.totalTransactions ?? 0, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Hoa hồng thu được', value: formatPrice(stats?.totalCommission ?? 0), icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const listingChartData = Object.entries(stats?.listingsByStatus ?? {}).map(([status, count]) => ({
    name: LISTING_STATUS_VN[status] ?? status,
    count,
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Tổng quan hệ thống</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className={`inline-flex rounded-xl p-2.5 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Commission chart */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Doanh thu hoa hồng theo tháng</h2>
          {commission.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={commission}>
                <defs>
                  <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Area type="monotone" dataKey="commission" stroke="#7c3aed" fill="url(#commGrad)" name="Hoa hồng" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Listing by status */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Tin đăng theo trạng thái</h2>
          {listingChartData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Chưa có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={listingChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Số lượng" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Price history chart */}
      {priceHistory.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Biến động giá gần đây</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={priceHistory}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="recordedAt" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(v: number) => formatPrice(v)}
                labelFormatter={(l) => `Ngày: ${l}`}
              />
              <Legend />
              <Area type="monotone" dataKey="price" stroke="#059669" fill="url(#priceGrad)" name="Giá (VND)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
