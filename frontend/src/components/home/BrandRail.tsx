import Link from 'next/link';
import {
  siApple, siSamsung, siXiaomi, siOppo, siVivo,
  siGoogle, siHonor, siHuawei,
} from 'simple-icons';

type SimpleIcon = { title: string; hex: string; path: string };

interface BrandWithCount {
  key: string;
  name: string;
  icon: SimpleIcon;
  override?: string;
  count?: number;
}

interface BrandRailProps {
  counts?: Record<string, number>;
}

const BRANDS: BrandWithCount[] = [
  { key: 'Apple',   name: 'Apple',   icon: siApple,   override: '#000' },
  { key: 'Samsung', name: 'Samsung', icon: siSamsung },
  { key: 'Xiaomi',  name: 'Xiaomi',  icon: siXiaomi },
  { key: 'OPPO',    name: 'OPPO',    icon: siOppo },
  { key: 'Vivo',    name: 'Vivo',    icon: siVivo },
  { key: 'Google',  name: 'Google',  icon: siGoogle },
  { key: 'Honor',   name: 'Honor',   icon: siHonor,   override: '#000' },
  { key: 'Huawei',  name: 'Huawei',  icon: siHuawei },
];

function color(b: BrandWithCount) {
  if (b.override) return b.override;
  return b.icon.hex.toLowerCase() === 'ffffff' ? '#1a1a1a' : `#${b.icon.hex}`;
}

export function BrandRail({ counts = {} }: BrandRailProps) {
  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-5">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Thương hiệu</span>
          <h2 className="font-headline font-extrabold text-2xl text-[#1E1B4B] tracking-tight mt-1">
            Tìm theo hãng bạn yêu thích
          </h2>
        </div>
        <Link href="/listings" className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
          Xem tất cả
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </Link>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        {BRANDS.map((b) => {
          const count = counts[b.key] ?? 0;
          return (
            <Link
              key={b.key}
              href={`/listings?brand=${encodeURIComponent(b.key)}`}
              className="bg-white rounded-2xl border border-purple-100 p-4 flex flex-col items-center gap-2 hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7 transition-transform group-hover:scale-110" fill={color(b)}>
                <path d={b.icon.path} />
              </svg>
              <span className="font-headline font-extrabold text-xs text-[#1E1B4B]">{b.name}</span>
              <span className="text-[10px] font-bold text-slate-400">{count} tin</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
