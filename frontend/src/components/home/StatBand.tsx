interface StatBandProps {
  totalListings?: number;
}

export function StatBand({ totalListings }: StatBandProps) {
  const stats = [
    {
      val: totalListings ? `${totalListings.toLocaleString('vi-VN')}+` : '1.247',
      label: 'Tin đăng đang bán',
      sub: 'cập nhật mỗi giờ',
    },
    { val: '95%', label: 'Độ chính xác AI', sub: 'so với giá thị trường' },
    { val: '48h', label: 'Trung bình bán xong', sub: 'cho máy được AI định giá' },
    { val: '4.8/5', label: 'Đánh giá người dùng', sub: '2.300+ review' },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 py-8 border-y border-dashed border-purple-200">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="font-headline font-black text-3xl md:text-[40px] text-[#1E1B4B] tracking-tighter leading-none">
            {s.val}
          </div>
          <div className="font-headline font-bold text-sm text-slate-900 mt-2">{s.label}</div>
          <div className="text-[11px] text-slate-400 mt-1">{s.sub}</div>
        </div>
      ))}
    </section>
  );
}
