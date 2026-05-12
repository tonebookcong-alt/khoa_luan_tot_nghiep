'use client';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Loader2, Plus, Pencil, Trash2, Search, X, ImageOff, ArrowLeft, Sparkles,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  parentId: string | null;
  parentName: string | null;
  childrenCount: number;
  listingCount: number;
  createdAt: string;
}

interface FormState {
  id?: string;
  name: string;
  slug: string;
  imageUrl: string;
  parentId: string;
}

const EMPTY_FORM: FormState = { name: '', slug: '', imageUrl: '', parentId: '' };

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminCategoriesPage() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const res = await api.get<CategoryRow[]>('/categories/admin', {
        params: q ? { search: q } : {},
      });
      setRows(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search.trim() || undefined), 300);
    return () => clearTimeout(t);
  }, [search]);

  const parentOptions = useMemo(() => rows.filter((r) => !r.parentId), [rows]);
  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  // Khi chọn 1 brand cha → bảng chỉ hiển thị brand đó + dòng con
  const visibleRows = useMemo(() => {
    if (!selected) return rows;
    return rows.filter((r) => r.id === selected.id || r.parentId === selected.id);
  }, [rows, selected]);

  // Chart: nếu chọn brand cha → biểu đồ các dòng con của nó
  // Nếu không → top 12 danh mục theo listingCount
  const chartData = useMemo(() => {
    if (selected) {
      const children = rows.filter((r) => r.parentId === selected.id);
      if (children.length === 0) {
        return [{ name: selected.name, count: selected.listingCount }];
      }
      return children
        .sort((a, b) => b.listingCount - a.listingCount)
        .map((r) => ({ name: r.name, count: r.listingCount }));
    }
    return rows
      .filter((r) => r.listingCount > 0)
      .sort((a, b) => b.listingCount - a.listingCount)
      .slice(0, 12)
      .map((r) => ({
        name: r.parentName ? `${r.parentName} / ${r.name}` : r.name,
        count: r.listingCount,
      }));
  }, [rows, selected]);

  // Tổng listing của brand đã chọn (gồm cả children)
  const selectedTotalListings = useMemo(() => {
    if (!selected) return 0;
    const children = rows.filter((r) => r.parentId === selected.id);
    return selected.listingCount + children.reduce((s, r) => s + r.listingCount, 0);
  }, [rows, selected]);

  const totalListings = rows.reduce((sum, r) => sum + r.listingCount, 0);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, parentId: selected ? selected.id : '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (row: CategoryRow) => {
    setForm({
      id: row.id,
      name: row.name,
      slug: row.slug,
      imageUrl: row.imageUrl ?? '',
      parentId: row.parentId ?? '',
    });
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const name = form.name.trim();
    if (!name) {
      setError('Tên là bắt buộc');
      return;
    }

    // Slug khi edit giữ nguyên giá trị có sẵn; khi tạo mới luôn sinh từ name
    const slug = form.id ? form.slug : slugify(name);
    if (!slug) {
      setError('Tên không hợp lệ — không thể tạo định danh URL từ tên này');
      return;
    }

    const payload: Record<string, unknown> = {
      name,
      slug,
    };
    if (form.imageUrl.trim()) payload.imageUrl = form.imageUrl.trim();
    if (form.parentId) payload.parentId = form.parentId;

    setSubmitting(true);
    try {
      if (form.id) {
        await api.patch(`/categories/${form.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      setModalOpen(false);
      await load(search.trim() || undefined);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Có lỗi xảy ra'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row: CategoryRow) => {
    if (!confirm(`Xóa danh mục "${row.name}"?`)) return;
    setDeleting(row.id);
    try {
      await api.delete(`/categories/${row.id}`);
      if (selectedId === row.id) setSelectedId(null);
      await load(search.trim() || undefined);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setDeleting(null);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await api.post<{ message: string }>('/categories/seed');
      await load();
      if (res.data?.message) alert(res.data.message);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e.response?.data?.message || 'Lỗi khi seed dữ liệu');
    } finally {
      setSeeding(false);
    }
  };

  const handleNameChange = (val: string) => {
    setForm((f) => ({ ...f, name: val }));
  };

  const isDbEmpty = !loading && rows.length === 0 && !search;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý danh mục</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleSeed}
            disabled={seeding}
            variant="outline"
            className="gap-2"
            title="Tạo 16 thương hiệu mặc định + link tin đăng cũ vào danh mục theo brand"
          >
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isDbEmpty ? 'Seed 16 thương hiệu mặc định' : 'Đồng bộ tin đăng → danh mục'}
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Thêm danh mục
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Tổng danh mục" value={rows.length} />
        <KpiCard label="Danh mục cha" value={rows.filter((r) => !r.parentId).length} />
        <KpiCard label="Tổng tin đăng" value={totalListings} />
      </div>

      {/* Selected detail panel */}
      {selected && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <button
              onClick={() => setSelectedId(null)}
              className="rounded-lg p-2 text-purple-600 hover:bg-white"
              title="Quay lại tất cả danh mục"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            {selected.imageUrl ? (
              <Image
                src={selected.imageUrl}
                alt={selected.name}
                width={56}
                height={56}
                unoptimized
                className="h-14 w-14 rounded-xl object-cover border border-purple-200 bg-white p-1"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-white flex items-center justify-center border border-purple-200">
                <ImageOff className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
              <p className="text-sm text-gray-500">
                {selected.parentName ? `Dòng con của ${selected.parentName}` : 'Thương hiệu cấp 1'}
                {' · '}
                <span className="font-mono">{selected.slug}</span>
              </p>
              <div className="mt-3 flex gap-6 text-sm">
                <div>
                  <span className="font-semibold text-purple-700 text-lg">{selectedTotalListings}</span>
                  <span className="text-gray-500 ml-1">tin đăng (gồm dòng con)</span>
                </div>
                <div>
                  <span className="font-semibold text-purple-700 text-lg">{selected.childrenCount}</span>
                  <span className="text-gray-500 ml-1">dòng con</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">
          {selected
            ? `Phân bố tin đăng theo dòng con của ${selected.name}`
            : 'Số lượng điện thoại theo danh mục (top 12)'}
        </h2>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Chưa có dữ liệu</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ left: 8, right: 8, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-30}
                textAnchor="end"
                interval={0}
                height={60}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Số lượng" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên hoặc slug..."
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            {isDbEmpty
              ? 'Chưa có danh mục nào — bấm "Seed 16 thương hiệu mặc định" để khởi tạo'
              : 'Không tìm thấy danh mục nào'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                {['Ảnh', 'Tên', 'Slug', 'Danh mục cha', 'Dòng con', 'Tin đăng', 'Hành động'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleRows.map((row) => {
                const isSelected = row.id === selectedId;
                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(isSelected ? null : row.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-purple-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      {row.imageUrl ? (
                        <Image
                          src={row.imageUrl}
                          alt={row.name}
                          width={40}
                          height={40}
                          unoptimized
                          className="h-10 w-10 rounded-lg object-contain border border-gray-200 bg-white p-1"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <ImageOff className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.slug}</td>
                    <td className="px-4 py-3 text-gray-500">{row.parentName ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-700">{row.childrenCount}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${
                        row.listingCount > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {row.listingCount}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(row)}
                          className="h-7 px-2"
                          title="Sửa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(row)}
                          disabled={deleting === row.id}
                          className="h-7 px-2"
                          title="Xóa"
                        >
                          {deleting === row.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {form.id ? 'Sửa danh mục' : 'Thêm danh mục'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
                disabled={submitting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="cat-name">Tên danh mục *</Label>
                <Input
                  id="cat-name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="VD: Apple, iPhone 15 series"
                  required
                />
                {!form.id && form.name.trim() && (
                  <p className="mt-1 text-xs text-gray-400">
                    Định danh URL: <span className="font-mono text-gray-600">{slugify(form.name) || '(không hợp lệ)'}</span>
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="cat-image">URL ảnh đại diện</Label>
                <Input
                  id="cat-image"
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://..."
                />
                {form.imageUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.imageUrl}
                      alt="preview"
                      className="h-12 w-12 rounded-lg object-contain border border-gray-200 bg-white p-1"
                      onError={(ev) => {
                        (ev.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="text-xs text-gray-400">Xem trước</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="cat-parent">Danh mục cha</Label>
                <select
                  id="cat-parent"
                  value={form.parentId}
                  onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                  className="flex h-10 w-full rounded-xl border border-purple-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">— Không có (danh mục cha) —</option>
                  {parentOptions
                    .filter((o) => o.id !== form.id)
                    .map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  Để trống nếu là thương hiệu (cấp 1). Chọn cha để tạo dòng con (cấp 2).
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal} disabled={submitting}>
                  Hủy
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {form.id ? 'Cập nhật' : 'Tạo mới'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
