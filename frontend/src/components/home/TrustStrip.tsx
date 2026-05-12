import {
  siApple, siSamsung, siGoogle,
} from 'simple-icons';

type SimpleIcon = { title: string; hex: string; path: string };

const PARTNERS: { name: string; icon?: SimpleIcon; color?: string }[] = [
  { name: 'Gemini Vision', color: '#1A73E8' },
  { name: 'YOLO v11', color: '#7C3AED' },
  { name: 'GHN Express', color: '#F59E0B' },
  { name: 'Apple', icon: siApple, color: '#000000' },
  { name: 'Samsung', icon: siSamsung, color: '#1428A0' },
  { name: 'Google', icon: siGoogle, color: '#4285F4' },
];

export function TrustStrip() {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="h-px flex-1 max-w-[80px] bg-purple-200" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Đối tác công nghệ &amp; thương hiệu hỗ trợ
        </span>
        <div className="h-px flex-1 max-w-[80px] bg-purple-200" />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
        {PARTNERS.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            {p.icon ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill={p.color ?? '#475569'}>
                <path d={p.icon.path} />
              </svg>
            ) : (
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: p.color ?? '#94A3B8' }}
              />
            )}
            <span className="font-headline font-bold text-sm text-slate-600">{p.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
