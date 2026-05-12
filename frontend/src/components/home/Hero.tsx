import Link from 'next/link';
import { PhoneIllustration } from './PhoneIllustration';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#1E1B4B] rounded-[2rem] p-8 md:p-12 mb-10">
      {/* Soft glows */}
      <div className="absolute -top-10 -right-10 w-80 h-80 bg-primary/30 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-16 left-20 w-72 h-72 bg-purple-500/20 blur-[90px] rounded-full pointer-events-none" />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        {/* Left: copy */}
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 mb-5 bg-white/10 backdrop-blur border border-white/15 rounded-full px-3 py-1.5">
            <span className="relative inline-flex h-2 w-2 text-emerald-400 pm-pulse-dot">
              <span className="absolute inset-0 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">
              1.247 đang xem · real-time
            </span>
          </div>

          <h1 className="text-4xl md:text-[56px] font-extrabold text-white font-headline leading-[1.05] tracking-tighter">
            Đừng đoán giá.<br />
            <span className="text-purple-300">Hỏi AI.</span>
          </h1>

          <p className="mt-5 text-white/70 text-base md:text-lg leading-relaxed max-w-md">
            Upload ảnh máy, AI phân tích trong 8 giây và đề xuất khoảng giá hợp lý. Minh bạch, miễn phí, không cần đăng ký.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-white font-bold rounded-full hover:bg-purple-700 transition-colors shadow-lg shadow-primary/30 text-sm"
            >
              <span className="material-symbols-outlined text-lg">search</span>
              Xem điện thoại
            </Link>
            <Link
              href="/listings/create"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 text-white font-bold rounded-full hover:bg-white/20 transition-colors border border-white/20 text-sm"
            >
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              Đăng bán + định giá AI
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex -space-x-2">
              {['#A78BFA', '#7C3AED', '#F59E0B', '#10B981', '#EF4444'].map((c, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full border-2 border-[#1E1B4B] flex items-center justify-center font-headline font-extrabold text-xs text-white"
                  style={{ background: `linear-gradient(135deg, ${c}, ${c}cc)` }}
                >
                  {['T', 'M', 'Q', 'L', 'H'][i]}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 text-amber-300">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                ))}
                <span className="ml-1 font-headline font-extrabold text-white text-sm">4.8</span>
              </div>
              <p className="text-[11px] text-white/50">2.300+ đánh giá · &quot;AI đoán đúng đến đáng sợ&quot;</p>
            </div>
          </div>
        </div>

        {/* Right: stacked phones + stickers */}
        <div className="relative h-[420px] hidden lg:block">
          {/* Back phone */}
          <div className="absolute right-24 top-4 pm-float" style={{ animationDelay: '0.6s' }}>
            <PhoneIllustration accent="#A78BFA" accent2="#7C3AED" tilt={12} size={220} />
          </div>
          {/* Front phone */}
          <div className="absolute right-2 top-12 pm-float">
            <PhoneIllustration accent="#7C3AED" accent2="#5B21B6" tilt={-6} size={240} />
          </div>

          {/* Floating price tag sticker */}
          <div
            className="absolute left-2 top-12 bg-white rounded-2xl shadow-2xl px-4 py-3 border border-purple-100"
            style={{ transform: 'rotate(-6deg)' }}
          >
            <div className="text-[9px] font-black uppercase tracking-widest text-purple-500">AI đề xuất</div>
            <div className="font-headline font-black text-[#1E1B4B] text-xl leading-tight">
              18.500.000<span className="text-sm">₫</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold mt-1">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              95% tin cậy
            </div>
          </div>

          {/* Floating condition badge sticker */}
          <div
            className="absolute right-12 bottom-12 bg-white rounded-2xl shadow-2xl px-3.5 py-2.5 border border-purple-100"
            style={{ transform: 'rotate(4deg)' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tình trạng</div>
                <div className="font-headline font-extrabold text-[#1E1B4B] text-sm">Như mới · 95%</div>
              </div>
            </div>
          </div>

          {/* Floating chip badge */}
          <div
            className="absolute left-8 bottom-20 bg-[#7C3AED] text-white rounded-full px-3 py-1.5 shadow-xl shadow-primary/40"
            style={{ transform: 'rotate(-3deg)' }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest">Gemini Vision</span>
          </div>
        </div>
      </div>
    </section>
  );
}
