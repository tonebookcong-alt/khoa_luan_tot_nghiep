'use client';
import { useEffect, useState } from 'react';
import { Users, ListChecks, Loader2, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, LineChart, Line, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '@/lib/axios';
import { formatPrice } from '@/lib/utils';

interface Stats {
  totalUsers: number;
  totalListings: number;
  listingsByStatus: Record<string, number>;
}

interface PricePoint { recordedAt: string; price: number; model: string; brand: string }
interface DailyPoint { date: string; listings: number; users: number }

const LISTING_STATUS_VN: Record<string, string> = {
  ACTIVE: 'Đang bán',
  DRAFT: 'Nháp',
  SOLD: 'Đã bán',
  REMOVED: 'Đã xóa',
};

// "2026-05-07" → "07/05"
const formatShortDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Stats>('/admin/stats'),
      api.get<PricePoint[]>('/admin/stats/price-history'),
      api.get<DailyPoint[]>('/admin/stats/daily?days=7'),
    ])
      .then(([s, p, d]) => {
        setStats(s.data);
        setPriceHistory(
          p.data
            .slice(0, 30)
            .map((r) => ({ ...r, recordedAt: r.recordedAt.slice(0, 10) }))
            .reverse(),
        );
        setDaily(d.data.map((row) => ({ ...row, date: formatShortDate(row.date) })));
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

  const newListings7d = daily.reduce((s, r) => s + r.listings, 0);
  const newUsers7d = daily.reduce((s, r) => s + r.users, 0);

  const kpis = [
    { label: 'Tổng người dùng', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Tổng tin đăng', value: stats?.totalListings ?? 0, icon: ListChecks, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Tin mới 7 ngày', value: newListings7d, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'User mới 7 ngày', value: newUsers7d, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const listingChartData = Object.entries(stats?.listingsByStatus ?? {}).map(([status, count]) => ({
    name: LISTING_STATUS_VN[status] ?? status,
    count,
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Tổng quan hệ thống</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
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

      {/* 7-day line chart */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Hoạt động 7 ngày qua</h2>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" /> Tin đăng</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> User mới</span>
          </div>
        </div>
        {daily.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Chưa có dữ liệu</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={daily} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="listings" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Tin đăng" />
              <Line type="monotone" dataKey="users" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="User mới" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Listing by status */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">Tin đăng theo trạng thái</h2>
        {listingChartData.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Chưa có dữ liệu</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
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

      {/* Price history chart */}
      {priceHistory.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Biến động giá gần đây</h2>
          <ResponsiveContainer width="100%" height={260}>
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
