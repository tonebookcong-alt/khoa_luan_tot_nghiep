import Link from 'next/link';

export function FeatureBento() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12 auto-rows-[minmax(180px,auto)]">
      {/* Big AI card */}
      <div className="md:col-span-2 md:row-span-2 bg-white rounded-[2rem] p-7 border border-purple-100 shadow-sm relative overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-72 h-72 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              AI · Gemini Vision
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> đang hoạt động
            </span>
          </div>

          <h3 className="font-headline font-extrabold text-2xl text-[#1E1B4B] tracking-tight max-w-md leading-tight">
            AI nhìn ảnh, đoán giá, phát hiện trầy xước &mdash; tất cả trong 8 giây.
          </h3>
          <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-lg">
            Upload 4-6 ảnh chụp máy, hệ thống YOLO + Gemini sẽ trích xuất trầy xước, sọc màn, móp vỏ và so chiếu với giá thị trường để đưa ra khoảng giá đề xuất.
          </p>

          {/* Mock photo strip */}
          <div className="mt-6 flex items-end gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`relative rounded-2xl border-2 ${i === 4 ? 'border-primary' : 'border-purple-100'} overflow-hidden`}
                style={{
                  width: i === 4 ? 88 : 64,
                  height: i === 4 ? 110 : 80,
                  background: `linear-gradient(135deg, ${i === 4 ? '#7C3AED' : '#EDE9FE'}, #fff)`,
                }}
              >
                <div className="absolute inset-2 bg-white rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-300 text-xl">image</span>
                </div>
                {i === 4 && (
                  <span className="absolute -top-2 -right-2 bg-amber-400 text-amber-950 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full shadow-lg">
                    AI
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 inline-flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-full px-3 py-1.5">
            <span className="material-symbols-outlined text-primary text-base">tips_and_updates</span>
            <span className="text-xs font-bold text-purple-900">
              AI gợi ý: ảnh #4 chụp rõ vết trầy &rarr; nên giảm 8% giá
            </span>
          </div>
        </div>
      </div>

      {/* Navy escrow */}
      <div className="bg-[#1E1B4B] text-white rounded-[2rem] p-6 relative overflow-hidden">
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/30 blur-[60px] rounded-full pointer-events-none" />
        <div className="relative">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 mb-3">
            <span className="material-symbols-outlined">shield</span>
          </div>
          <h3 className="font-headline font-extrabold text-lg leading-tight">
            Trao đổi an toàn,<br />không ép buộc
          </h3>
          <p className="mt-2 text-xs text-white/60 leading-relaxed">
            Bạn quyết định gặp gỡ, kiểm tra máy và thanh toán theo cách của riêng mình.
          </p>
        </div>
      </div>

      {/* Chat */}
      <div className="bg-white rounded-[2rem] p-6 border border-purple-100 shadow-sm">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 mb-3">
          <span className="material-symbols-outlined">chat_bubble</span>
        </div>
        <h3 className="font-headline font-extrabold text-base text-[#1E1B4B] leading-tight">Chat real-time</h3>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          Nhắn tin trực tiếp với người bán, thương lượng nhanh không qua trung gian.
        </p>
        <Link href="/dashboard/messages" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
          Vào hộp thư
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </div>

      {/* Gặp mặt */}
      <div className="bg-white rounded-[2rem] p-6 border border-purple-100 shadow-sm">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 mb-3">
          <span className="material-symbols-outlined">handshake</span>
        </div>
        <h3 className="font-headline font-extrabold text-base text-[#1E1B4B] leading-tight">Gặp mặt linh hoạt</h3>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          Hẹn gặp tại quán cà phê hay trung tâm thương mại — kiểm tra máy tận tay rồi mới chốt.
        </p>
      </div>
    </section>
  );
}
