import Link from 'next/link';

export function PromoStrip() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] mb-12">
      <div
        className="relative p-8 md:p-10"
        style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #1E1B4B 100%)',
        }}
      >
        {/* Glows */}
        <div className="absolute -top-12 right-12 w-60 h-60 bg-white/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-16 -left-12 w-72 h-72 bg-purple-300/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <span className="inline-block text-[10px] font-black uppercase tracking-widest text-purple-200 bg-white/10 backdrop-blur border border-white/15 rounded-full px-3 py-1.5 mb-4">
              Đăng tin trong 3 phút
            </span>
            <h3 className="font-headline font-extrabold text-2xl md:text-3xl text-white tracking-tight leading-tight">
              Sẵn sàng bán điện thoại cũ?<br />
              <span className="text-purple-200">AI định giá miễn phí cho bạn.</span>
            </h3>
            <p className="mt-3 text-sm text-white/70 max-w-md">
              Upload 4-6 ảnh, nhận khoảng giá đề xuất kèm phân tích chi tiết. Bạn chốt giá cuối, không phải AI.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Link
              href="/listings/create"
              className="inline-flex items-center gap-2 px-7 py-4 bg-white text-[#1E1B4B] font-bold rounded-full hover:bg-purple-50 transition-colors shadow-2xl text-sm whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              Đăng bán + định giá AI
            </Link>
            <p className="text-[11px] text-white/50 text-center">Miễn phí · không cần đăng ký trước</p>
          </div>
        </div>
      </div>
    </section>
  );
}
