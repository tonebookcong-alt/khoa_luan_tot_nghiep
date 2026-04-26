'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SlidersHorizontal, ChevronDown, ChevronUp, X } from 'lucide-react';
import {
  siApple, siSamsung, siXiaomi, siOppo, siVivo, siHonor,
  siGoogle, siHuawei, siOneplus, siNokia, siAsus, siLenovo,
  siSony, siMotorola, siLg,
} from 'simple-icons';
import { api } from '@/lib/axios';
import { ListingCardRow } from '@/components/listings/ListingCardRow';
import { Listing, PaginatedResponse, DeviceCondition } from '@/types/api.types';
import { formatPrice } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────
type SimpleIcon = { title: string; hex: string; path: string };
type BrandEntry  = { key: string; name: string; icon: SimpleIcon | null; override?: string };

// ── Brand data ────────────────────────────────────────────────────────────────
const SIDEBAR_BRANDS: BrandEntry[] = [
  { key: 'Apple',    name: 'Apple',    icon: siApple                              },
  { key: 'Samsung',  name: 'Samsung',  icon: siSamsung                            },
  { key: 'Xiaomi',   name: 'Xiaomi',   icon: siXiaomi                             },
  { key: 'OPPO',     name: 'OPPO',     icon: siOppo                               },
  { key: 'Vivo',     name: 'Vivo',     icon: siVivo                               },
  // Realme not in simple-icons → custom SVG text
  { key: 'Realme',   name: 'Realme',   icon: null,         override: '#FFAE42'    },
  { key: 'Honor',    name: 'Honor',    icon: siHonor                              },
  { key: 'Google',   name: 'Google',   icon: siGoogle                             },
  { key: 'Huawei',   name: 'Huawei',   icon: siHuawei                             },
  { key: 'OnePlus',  name: 'OnePlus',  icon: siOneplus                            },
  { key: 'Nokia',    name: 'Nokia',    icon: siNokia                              },
  { key: 'LG',       name: 'LG',       icon: siLg                                 },
  { key: 'ASUS',     name: 'ASUS',     icon: siAsus                               },
  // Sony hex is #ffffff (white) → override with Sony dark blue
  { key: 'Sony',     name: 'Sony',     icon: siSony,       override: '#003087'    },
  { key: 'Motorola', name: 'Motorola', icon: siMotorola                           },
  { key: 'Lenovo',   name: 'Lenovo',   icon: siLenovo                             },
];

function iconColor(b: BrandEntry): string {
  if (b.override) return b.override;
  if (!b.icon)    return '#6b7280';
  return b.icon.hex.toLowerCase() === 'ffffff' ? '#1a1a1a' : `#${b.icon.hex}`;
}

// ── Price slider ──────────────────────────────────────────────────────────────
const PRICE_MIN  = 0;
const PRICE_MAX  = 50_000_000;
const PRICE_STEP = 500_000;

function PriceSlider({ value, onChange }: { value: [number, number]; onChange: (v: [number, number]) => void }) {
  const leftPct  = ((value[0] - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const rightPct = ((value[1] - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  return (
    <div className="px-1">
      <div className="relative h-8 flex items-center">
        <div className="absolute w-full h-1 bg-slate-200 rounded-full" />
        <div
          className="absolute h-1 bg-primary rounded-full pointer-events-none"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
        <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={PRICE_STEP} value={value[0]}
          onChange={(e) => onChange([Math.min(Number(e.target.value), value[1] - PRICE_STEP), value[1]])}
          className="absolute w-full h-full opacity-0 cursor-pointer"
          style={{ zIndex: leftPct > 90 ? 5 : 3 }}
        />
        <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={PRICE_STEP} value={value[1]}
          onChange={(e) => onChange([value[0], Math.max(Number(e.target.value), value[0] + PRICE_STEP)])}
          className="absolute w-full h-full opacity-0 cursor-pointer"
          style={{ zIndex: 4 }}
        />
        <div className="absolute w-4 h-4 bg-white border-2 border-primary rounded-full shadow pointer-events-none -translate-x-1/2"
          style={{ left: `${leftPct}%`, zIndex: 6 }} />
        <div className="absolute w-4 h-4 bg-white border-2 border-primary rounded-full shadow pointer-events-none -translate-x-1/2"
          style={{ left: `${rightPct}%`, zIndex: 6 }} />
      </div>
      <div className="flex items-center justify-between mt-2 text-[10px] font-semibold text-slate-600">
        <span className="bg-slate-100 px-1.5 py-0.5 rounded-md">{formatPrice(value[0])}</span>
        <span className="text-slate-300">—</span>
        <span className="bg-slate-100 px-1.5 py-0.5 rounded-md">{formatPrice(value[1])}</span>
      </div>
    </div>
  );
}

// ── Drawer sub-components ─────────────────────────────────────────────────────
const STORAGE_OPTIONS   = ['< 8GB', '8 GB', '16 GB', '32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB'];
const COLOR_OPTIONS     = ['Bạc', 'Đen', 'Đen bóng - Jet black', 'Đỏ', 'Hồng', 'Trắng', 'Vàng', 'Xám', 'Xanh dương', 'Xanh lá', 'Tím', 'Cam'];
const CONDITION_OPTIONS = [
  { value: 'NEW',      label: 'Mới 100%' },
  { value: 'LIKE_NEW', label: 'Như mới'  },
  { value: 'GOOD',     label: 'Tốt'      },
  { value: 'FAIR',     label: 'Khá'      },
  { value: 'POOR',     label: 'Kém'      },
];
const SELLER_OPTIONS = ['Cá nhân', 'Bán chuyên'];

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-gray-100 py-4">
      <button className="flex w-full items-center justify-between text-sm font-bold text-slate-900 mb-3"
        onClick={() => setOpen(!open)}>
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && children}
    </div>
  );
}

function FilterRadioList({ items, selected, onSelect }: { items: { value: string; label: string }[]; selected: string; onSelect: (v: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, 5);
  return (
    <div className="space-y-3">
      {visible.map((item) => (
        <label key={item.value} className="flex items-center justify-between cursor-pointer group">
          <span className="text-sm text-slate-700 group-hover:text-primary transition-colors">{item.label}</span>
          <input type="radio" name={`radio-${item.label}`} checked={selected === item.value}
            onChange={() => onSelect(selected === item.value ? '' : item.value)}
            className="h-4 w-4 accent-primary cursor-pointer" />
        </label>
      ))}
      {items.length > 5 && (
        <button onClick={() => setShowAll(!showAll)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary mt-1 transition-colors">
          {showAll ? 'Thu gọn' : 'Xem thêm'}<ChevronDown className={`h-3 w-3 transition-transform ${showAll ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}

function FilterCheckboxList({ items, selected, onSelect }: { items: string[]; selected: string[]; onSelect: (v: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, 5);
  return (
    <div className="space-y-3">
      {visible.map((item) => (
        <label key={item} className="flex items-center justify-between cursor-pointer group">
          <span className="text-sm text-slate-700 group-hover:text-primary transition-colors">{item}</span>
          <input type="checkbox" checked={selected.includes(item)} onChange={() => onSelect(item)}
            className="h-4 w-4 rounded accent-primary cursor-pointer" />
        </label>
      ))}
      {items.length > 5 && (
        <button onClick={() => setShowAll(!showAll)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary mt-1 transition-colors">
          {showAll ? 'Thu gọn' : 'Xem thêm'}<ChevronDown className={`h-3 w-3 transition-transform ${showAll ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const LOCATION_CHIPS = ['Tp Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];
const SORT_OPTIONS   = [
  { value: 'newest',     label: 'Mới nhất'       },
  { value: 'price_asc',  label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
];

export function ListingsContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [listings, setListings]     = useState<Listing[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);

  const [priceRange, setPriceRange] = useState<[number, number]>(() => [
    Number(searchParams.get('minPrice') || PRICE_MIN),
    Number(searchParams.get('maxPrice') || PRICE_MAX),
  ]);

  const [tmpBrand,     setTmpBrand]     = useState('');
  const [tmpStorage,   setTmpStorage]   = useState<string[]>([]);
  const [tmpColor,     setTmpColor]     = useState('');
  const [tmpCondition, setTmpCondition] = useState('');
  const [tmpSeller,    setTmpSeller]    = useState('');

  const search    = searchParams.get('search')    ?? '';
  const brand     = searchParams.get('brand')     ?? '';
  const location  = searchParams.get('location')  ?? '';
  const condition = (searchParams.get('condition') ?? '') as DeviceCondition | '';
  const sort      = searchParams.get('sort')      ?? 'newest';
  const page      = Number(searchParams.get('page') ?? '1');
  const minPrice  = Number(searchParams.get('minPrice') || PRICE_MIN);
  const maxPrice  = Number(searchParams.get('maxPrice') || PRICE_MAX);

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => { if (v) params.set(k, v); else params.delete(k); });
    params.delete('page');
    router.push(`/listings?${params.toString()}`);
  }, [searchParams, router]);

  const applyPrice = () => {
    updateParams({
      minPrice: priceRange[0] > PRICE_MIN ? String(priceRange[0]) : '',
      maxPrice: priceRange[1] < PRICE_MAX ? String(priceRange[1]) : '',
    });
  };

  const openModal = () => {
    setTmpBrand(brand); setTmpCondition(condition);
    setTmpStorage([]); setTmpColor(''); setTmpSeller('');
    setShowModal(true);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const p = new URLSearchParams();
        if (search)              p.set('search', search);
        if (brand)               p.set('brand', brand);
        if (location)            p.set('location', location);
        if (condition)           p.set('condition', condition);
        if (minPrice > PRICE_MIN) p.set('minPrice', String(minPrice));
        if (maxPrice < PRICE_MAX) p.set('maxPrice', String(maxPrice));
        p.set('sort', sort); p.set('page', String(page)); p.set('limit', '12');
        const res = await api.get<PaginatedResponse<Listing>>(`/listings?${p.toString()}`);
        setListings(res.data.data);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } catch { setListings([]); }
      finally  { setLoading(false); }
    })();
  }, [search, brand, location, condition, sort, page, minPrice, maxPrice]);

  const activeCount = [brand, condition].filter(Boolean).length;
  const priceActive = minPrice > PRICE_MIN || maxPrice < PRICE_MAX;

  return (
    <div className="min-h-screen pt-24 pb-12 max-w-7xl mx-auto px-4 md:px-8">
      <div className="flex gap-5">

        {/* ─── Left sidebar ──────────────────────────────────────────────── */}
        <aside className="w-48 shrink-0 space-y-3 self-start sticky top-24">

          {/* Price slider */}
          <div className="bg-white rounded-2xl border border-purple-50 shadow-sm p-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Khoảng giá</h3>
            <PriceSlider value={priceRange} onChange={setPriceRange} />
            <button onClick={applyPrice}
              className={`mt-3 w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                priceActive
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              Áp dụng
            </button>
            {priceActive && (
              <button
                onClick={() => { setPriceRange([PRICE_MIN, PRICE_MAX]); updateParams({ minPrice: '', maxPrice: '' }); }}
                className="mt-1 w-full text-[10px] font-semibold text-slate-400 hover:text-primary transition-colors">
                Xóa lọc giá
              </button>
            )}
          </div>

          {/* Brand logos — vertical list */}
          <div className="bg-white rounded-2xl border border-purple-50 shadow-sm p-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Thương hiệu</h3>

            <div className="flex flex-col gap-0.5">
              {SIDEBAR_BRANDS.map((b) => {
                const active = brand === b.key;
                const color  = iconColor(b);
                return (
                  <button
                    key={b.key}
                    onClick={() => updateParams({ brand: active ? '' : b.key })}
                    className={`flex items-center gap-3 w-full px-2.5 py-2 rounded-xl transition-all text-left ${
                      active
                        ? 'bg-primary/8 ring-1 ring-primary/25'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Icon */}
                    <div className="w-7 h-7 flex items-center justify-center shrink-0">
                      {b.icon ? (
                        <svg viewBox="0 0 24 24" width={22} height={22} fill={color}>
                          <path d={b.icon.path} />
                        </svg>
                      ) : (
                        /* Realme fallback — styled italic text */
                        <span className="text-[11px] italic font-black" style={{ color }}>real</span>
                      )}
                    </div>
                    {/* Name */}
                    <span className={`text-sm font-semibold truncate ${active ? 'text-primary' : 'text-slate-700'}`}>
                      {b.name}
                    </span>
                    {/* Active dot */}
                    {active && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {brand && (
              <button onClick={() => updateParams({ brand: '' })}
                className="mt-2 w-full text-[10px] font-semibold text-slate-400 hover:text-primary transition-colors">
                Bỏ chọn
              </button>
            )}
          </div>

        </aside>

        {/* ─── Main content ───────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Filter bar */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button onClick={openModal}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 text-sm font-semibold hover:border-primary hover:text-primary transition-colors bg-white">
              <SlidersHorizontal className="h-4 w-4" />
              Lọc
              {activeCount > 0 && (
                <span className="h-5 w-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>

            {brand && (
              <span className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                {brand}<button onClick={() => updateParams({ brand: '' })}><X className="h-3 w-3" /></button>
              </span>
            )}
            {condition && (
              <span className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                {CONDITION_OPTIONS.find(c => c.value === condition)?.label}
                <button onClick={() => updateParams({ condition: '' })}><X className="h-3 w-3" /></button>
              </span>
            )}

            {(['Dung lượng', 'Màu sắc', 'Tình trạng', 'Đăng bởi'] as const).map((label) => (
              <button key={label} onClick={openModal}
                className="flex items-center gap-1 px-4 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:border-primary hover:text-primary bg-white transition-colors">
                {label} <ChevronDown className="h-3.5 w-3.5" />
              </button>
            ))}

            <select value={sort} onChange={(e) => updateParams({ sort: e.target.value })}
              className="ml-auto px-3 py-2 rounded-full border border-slate-200 text-sm font-medium bg-white outline-none cursor-pointer hover:border-primary transition-colors">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Location row */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500 font-medium">Khu vực:</span>
            {LOCATION_CHIPS.map((loc) => {
              const active = location === loc;
              return (
                <button key={loc}
                  onClick={() => updateParams({ location: active ? '' : loc })}
                  className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                    active
                      ? 'border-primary bg-primary text-white'
                      : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary bg-white'
                  }`}>
                  {loc}
                </button>
              );
            })}
          </div>

          {/* Results count */}
          <p className="mb-4 text-sm text-slate-500 font-medium">
            {loading ? 'Đang tải...' : `${total} kết quả`}
            {(brand || condition || location || search || priceActive) && (
              <button onClick={() => { setPriceRange([PRICE_MIN, PRICE_MAX]); updateParams({ brand: '', condition: '', location: '', search: '', minPrice: '', maxPrice: '' }); }}
                className="ml-3 text-xs text-primary hover:underline">
                Xóa tất cả bộ lọc
              </button>
            )}
          </p>

          {/* Listing list */}
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/80" />
              ))}
            </div>
          ) : listings.length > 0 ? (
            <div className="flex flex-col gap-3">
              {listings.map((listing) => <ListingCardRow key={listing.id} listing={listing} />)}
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-purple-50 py-20 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-200">search_off</span>
              <p className="mt-3 text-slate-500">Không tìm thấy kết quả phù hợp</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p}
                  onClick={() => { const ps = new URLSearchParams(searchParams.toString()); ps.set('page', String(p)); router.push(`/listings?${ps.toString()}`); }}
                  className={`h-10 w-10 rounded-full text-sm font-bold transition-all ${
                    p === page ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border border-purple-100 text-slate-600 hover:border-primary hover:text-primary'
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Advanced Filter Drawer ──────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="w-80 bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <button onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5 text-slate-600" />
              </button>
              <h2 className="text-base font-bold text-slate-900">Lọc Nâng Cao</h2>
              <div className="w-8" />
            </div>
            <div className="flex-1 overflow-y-auto px-6">
              <FilterSection title="Hãng">
                <FilterRadioList
                  items={SIDEBAR_BRANDS.map((b) => ({ value: b.key, label: b.name }))}
                  selected={tmpBrand} onSelect={setTmpBrand}
                />
              </FilterSection>
              <FilterSection title="Dung lượng">
                <FilterCheckboxList items={STORAGE_OPTIONS} selected={tmpStorage}
                  onSelect={(v) => setTmpStorage((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v])} />
              </FilterSection>
              <FilterSection title="Màu sắc">
                <FilterRadioList items={COLOR_OPTIONS.map((c) => ({ value: c, label: c }))}
                  selected={tmpColor} onSelect={setTmpColor} />
              </FilterSection>
              <FilterSection title="Tình trạng">
                <FilterRadioList items={CONDITION_OPTIONS} selected={tmpCondition} onSelect={setTmpCondition} />
              </FilterSection>
              <FilterSection title="Đăng bởi">
                <FilterRadioList items={SELLER_OPTIONS.map((s) => ({ value: s, label: s }))}
                  selected={tmpSeller} onSelect={setTmpSeller} />
              </FilterSection>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={() => { setTmpBrand(''); setTmpStorage([]); setTmpColor(''); setTmpCondition(''); setTmpSeller(''); }}
                className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                Xóa lọc
              </button>
              <button onClick={() => { updateParams({ brand: tmpBrand, condition: tmpCondition }); setShowModal(false); }}
                className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
