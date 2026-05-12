import {
  Smartphone, RotateCcw, Maximize2, Camera, ScanSearch,
} from 'lucide-react';

const TIPS: { icon: React.ComponentType<{ className?: string }>; label: string; desc: string; required?: boolean }[] = [
  { icon: Smartphone,      label: 'Mặt trước',         desc: 'Màn hình BẬT, tắt bộ lọc/bảo vệ, không che cảm biến', required: true },
  { icon: RotateCcw,       label: 'Mặt sau',           desc: 'Chụp rõ logo, camera, phải đủ ánh sáng', required: true },
  { icon: Maximize2,       label: '4 cạnh máy',        desc: 'Chụp riêng 4 cạnh để AI thấy móp/cấn (nếu có)', required: true },
  { icon: Camera,          label: 'Cụm camera',        desc: 'Chụp gần cụm camera để AI kiểm tra ống kính có nứt' },
  { icon: ScanSearch,      label: 'Vùng có vết trầy',  desc: 'Zoom sát các vết trầy/nứt nếu có — tăng độ chính xác' },
];

interface PhotoGuideProps {
  className?: string;
}

export function PhotoGuide({ className = '' }: PhotoGuideProps) {
  return (
    <div className={`rounded-2xl border border-purple-100 bg-purple-50/40 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-base text-primary">photo_camera</span>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Hướng dẫn chụp ảnh để AI định giá chính xác
        </p>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed mb-3">
        Nên chụp <span className="font-semibold text-slate-800">4-6 ảnh</span>, ánh sáng tự nhiên (không flash trực tiếp), nền đơn sắc. Ảnh càng rõ, AI càng đoán chính xác hơn.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {TIPS.map(({ icon: Icon, label, desc, required }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-purple-100 p-3 flex items-start gap-2.5"
          >
            <div className="shrink-0 h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-xs text-slate-900">{label}</p>
                {required && (
                  <span className="text-[9px] font-black uppercase tracking-widest bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded">
                    Bắt buộc
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        <span className="material-symbols-outlined text-sm shrink-0">warning</span>
        <p>
          <span className="font-bold">Tránh:</span> ảnh quảng cáo từ web, ảnh stock/render, ảnh chụp quá tối hoặc out nét — AI sẽ flag là &quot;ảnh không thực&quot; và không thể định giá.
        </p>
      </div>
    </div>
  );
}
