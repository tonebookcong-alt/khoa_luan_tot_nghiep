'use client'

const PART_LABELS: Record<string, string> = {
  screen: 'Màn hình',
  battery: 'Pin',
  housing: 'Vỏ máy',
  camera: 'Camera',
  other: 'Khác',
}

const PART_ICONS: Record<string, string> = {
  screen: 'phone_android',
  battery: 'battery_5_bar',
  housing: 'devices',
  camera: 'camera_alt',
  other: 'settings',
}

interface DamageItem {
  part: string
  severity: number
  description: string
  weight: number
  deductionPercent: number
}

interface AiPricingData {
  pMarket: number
  pFinal: number
  priceRange: { low: number; high: number }
  damageBreakdown: DamageItem[]
  confidenceScore: number
  detectedModel: string
  overallCondition: string
  summary: string
  marketSummary: string
  dataPoints: number
  imageType?: 'real_device' | 'marketing' | 'unclear'
}

interface Props {
  data: AiPricingData
  onUsePrice: (price: number) => void
}

export function AiPricingResult({ data, onUsePrice }: Props) {
  const formatVND = (amount: number) =>
    amount > 0
      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
      : 'Không có dữ liệu'

  const conditionLabel: Record<string, string> = {
    LIKE_NEW: 'Như mới',
    GOOD: 'Tốt',
    FAIR: 'Khá',
    POOR: 'Kém',
  }

  const confidencePct = Math.round(data.confidenceScore * 100)

  const getSeverityColor = (severity: number) => {
    if (severity < 0.1) return 'bg-green-500'
    if (severity < 0.3) return 'bg-yellow-400'
    if (severity < 0.6) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getSeverityLabel = (severity: number) => {
    if (severity < 0.05) return 'Nguyên vẹn'
    if (severity < 0.2) return 'Nhẹ'
    if (severity < 0.4) return 'Trung bình'
    if (severity < 0.7) return 'Nặng'
    return 'Nghiêm trọng'
  }

  const isNonRealImage = data.imageType === 'marketing' || data.imageType === 'unclear'

  return (
    <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 shadow-sm space-y-5">
      {/* Warning banner — ảnh quảng cáo */}
      {isNonRealImage && (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <span className="material-symbols-outlined text-amber-500 mt-0.5 shrink-0">warning</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {data.imageType === 'marketing' ? 'Phát hiện ảnh quảng cáo' : 'Ảnh không rõ ràng'}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              AI không thể đánh giá hư hỏng từ {data.imageType === 'marketing' ? 'ảnh quảng cáo/sản phẩm mới' : 'ảnh này'}.
              Hãy tải lên ảnh chụp thực tế thiết bị của bạn để nhận kết quả định giá chính xác.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
          <span className="material-symbols-outlined text-lg">auto_awesome</span>
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Kết quả định giá AI</h3>
          <p className="text-xs text-slate-500">
            {data.detectedModel} · {conditionLabel[data.overallCondition] ?? data.overallCondition}
          </p>
        </div>
        {/* Confidence badge */}
        <div className={`ml-auto flex items-center gap-1.5 rounded-full bg-white border px-3 py-1 ${isNonRealImage ? 'border-amber-200' : 'border-purple-100'}`}>
          <span className={`material-symbols-outlined text-sm ${isNonRealImage ? 'text-amber-500' : 'text-primary'}`}>
            {isNonRealImage ? 'info' : 'verified'}
          </span>
          <span className={`text-xs font-bold ${isNonRealImage ? 'text-amber-600' : 'text-primary'}`}>
            {confidencePct}% tin cậy
          </span>
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <p className="text-sm text-slate-600 italic border-l-2 border-primary/30 pl-3">
          &ldquo;{data.summary}&rdquo;
        </p>
      )}

      {/* Damage Breakdown */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Phân tích hư hỏng</p>
        {data.damageBreakdown.map((item) => (
          <div key={item.part} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-slate-400">
                  {PART_ICONS[item.part] ?? 'info'}
                </span>
                <span className="font-medium text-slate-700">
                  {PART_LABELS[item.part] ?? item.part}
                </span>
                <span className="text-xs text-slate-400">
                  (trọng số {Math.round(item.weight * 100)}%)
                </span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${getSeverityColor(item.severity)}`}>
                {getSeverityLabel(item.severity)}
              </span>
            </div>
            {/* Progress bar */}
            <div className="relative h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${getSeverityColor(item.severity)}`}
                style={{ width: `${Math.max(item.severity * 100, 2)}%` }}
              />
            </div>
            {item.description && (
              <p className="text-xs text-slate-500 pl-6">{item.description}</p>
            )}
          </div>
        ))}
      </div>

      {/* Price Result */}
      <div className="rounded-2xl bg-white border border-purple-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Giá thị trường ({data.dataPoints} tin đăng)</p>
            <p className="font-semibold text-slate-700">{formatVND(data.pMarket)}</p>
          </div>
          <span className="material-symbols-outlined text-slate-300">arrow_forward</span>
          <div className="text-right">
            <p className="text-xs text-slate-400">Giá đề xuất sau khấu hao</p>
            <p className="text-xl font-extrabold text-primary">{formatVND(data.pFinal)}</p>
          </div>
        </div>

        {data.pFinal > 0 && (
          <p className="text-xs text-center text-slate-400">
            Khoảng giá: {formatVND(data.priceRange.low)} – {formatVND(data.priceRange.high)}
          </p>
        )}

        {data.marketSummary && (
          <p className="text-xs text-slate-500 text-center">{data.marketSummary}</p>
        )}
      </div>

      {/* CTA */}
      {data.pFinal > 0 && (
        <button
          type="button"
          onClick={() => onUsePrice(data.pFinal)}
          className="w-full rounded-full bg-primary py-3 text-sm font-bold text-white hover:bg-purple-700 transition-colors"
        >
          Dùng giá này ({formatVND(data.pFinal)})
        </button>
      )}
    </div>
  )
}
