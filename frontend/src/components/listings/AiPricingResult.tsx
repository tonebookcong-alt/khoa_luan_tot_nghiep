'use client'

import { useEffect, useState } from 'react'

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

const LOCATION_LABELS: Record<string, string> = {
  screen: 'màn hình',
  housing: 'vỏ máy',
  camera: 'camera',
  other: 'chi tiết khác',
}

interface DamageItem {
  part: string
  severity: number
  description: string
  weight: number
  deductionPercent: number
}

interface DamageDetection {
  label: string
  labelDisplay: string
  confidence: number
  imageIndex: number
  bbox: { xMin: number; yMin: number; xMax: number; yMax: number }
  imageWidth: number
  imageHeight: number
  areaRatio: number
  location: 'screen' | 'housing' | 'camera' | 'other'
}

interface ImageMeta {
  index: number
  width: number
  height: number
  detectionCount: number
}

interface MarketSample {
  source: string
  url: string
  title: string
  price: number
  location: string
  postedAtText: string
  scrapedAt: string
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
  // Mới
  detectedGeneration?: string | null
  claimedModel?: string
  claimedMatches?: boolean
  damageDetections?: DamageDetection[]
  images?: ImageMeta[]
  marketSamples?: MarketSample[]
  dataSource?: 'live_scrape' | 'mongodb_cache' | 'mock_fallback' | 'unavailable'
}

interface Props {
  data: AiPricingData
  /** URL ảnh đã sẵn sàng (preview blob URL hoặc URL hosted). Component chỉ render, không quản lý lifecycle. */
  imageUrls?: string[]
  onUsePrice?: (price: number) => void
  /** Tắt nút "Dùng giá này" — dùng cho detail view chỉ đọc */
  readOnly?: boolean
}

export function AiPricingResult({ data, imageUrls, onUsePrice, readOnly }: Props) {
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
  const isFraudSuspected =
    data.detectedGeneration != null &&
    data.claimedMatches === false &&
    data.confidenceScore >= 0.4

  const detections = data.damageDetections ?? []
  const totalDetections = detections.length
  const imageMetas = data.images ?? []

  const urls = imageUrls ?? []
  const [showDetail, setShowDetail] = useState(false)
  const [activeImage, setActiveImage] = useState(0)

  // Reset activeImage nếu vượt quá số ảnh hiện có
  useEffect(() => {
    if (activeImage >= urls.length && urls.length > 0) {
      setActiveImage(0)
    }
  }, [urls.length, activeImage])

  return (
    <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 shadow-sm space-y-5">
      {/* #3 Fraud Warning — banner đỏ prominent nếu generation mismatch */}
      {isFraudSuspected && (
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 border-2 border-red-300 p-4">
          <span className="material-symbols-outlined text-red-600 mt-0.5 shrink-0">gpp_maybe</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-900 uppercase tracking-wider">
              ⚠️ Cảnh báo lừa đảo tiềm tàng
            </p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-white border border-red-200 p-2">
                <p className="text-[10px] uppercase text-red-500 font-bold">Bạn khai báo</p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {data.claimedModel || '—'}
                </p>
              </div>
              <div className="rounded-lg bg-white border border-red-200 p-2">
                <p className="text-[10px] uppercase text-red-500 font-bold">AI nhận diện</p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {data.detectedModel} ({Math.round((data.confidenceScore ?? 0) * 100)}%)
                </p>
              </div>
            </div>
            <p className="text-xs text-red-700 mt-2">
              Hệ thống nhận diện máy có vẻ <b>khác với khai báo</b>. Vui lòng kiểm tra lại model
              hoặc tải ảnh rõ nét hơn để giảm rủi ro tin đăng bị flag bởi admin.
            </p>
          </div>
        </div>
      )}

      {/* Warning ảnh quảng cáo (cho path Gemini cũ — vẫn giữ tương thích) */}
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
            {totalDetections > 0 && (
              <> · <span className="text-rose-600 font-semibold">{totalDetections} hư hỏng được phát hiện</span></>
            )}
          </p>
        </div>
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

      {/* #2 Image gallery với bbox overlay */}
      {urls.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Ảnh phân tích — AI khoanh vùng hư hỏng
          </p>

          {/* Main image với bbox — key buộc remount khi đổi ảnh để tránh stale state */}
          {urls[activeImage] && (
            <BboxOverlayImage
              key={`bbox-${activeImage}`}
              url={urls[activeImage]}
              imageMeta={imageMetas.find((m) => m.index === activeImage)}
              detections={detections.filter((d) => d.imageIndex === activeImage)}
            />
          )}

          {/* Thumbnails */}
          {urls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {urls.map((url, idx) => {
                const meta = imageMetas.find((m) => m.index === idx)
                const count = meta?.detectionCount ?? 0
                const isActive = idx === activeImage
                return (
                  <button
                    key={`thumb-${idx}`}
                    type="button"
                    onClick={() => setActiveImage(idx)}
                    className={`relative shrink-0 rounded-lg overflow-hidden border-2 transition ${isActive ? 'border-primary ring-2 ring-primary/30' : 'border-slate-200'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-16 w-16 object-cover" />
                    {count > 0 && (
                      <span className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-1.5 rounded-bl-lg">
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* #1 Damage Detections list — chi tiết từng hư hỏng */}
      {detections.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            className="flex items-center justify-between w-full text-left"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Chi tiết {detections.length} hư hỏng được phát hiện
            </p>
            <span className="material-symbols-outlined text-base text-slate-400">
              {showDetail ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {showDetail && (
            <ul className="space-y-2">
              {detections.slice(0, 10).map((d, idx) => (
                <li
                  key={`${d.imageIndex}-${idx}`}
                  className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 p-2.5"
                >
                  <span
                    className={`flex h-2 w-2 rounded-full shrink-0 ${getConfidenceDotColor(d.confidence)}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {d.labelDisplay}{' '}
                      <span className="text-xs text-slate-500">
                        ở {LOCATION_LABELS[d.location] ?? d.location}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Ảnh #{d.imageIndex + 1} · {Math.round(d.areaRatio * 1000) / 10}% diện tích máy
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-700 shrink-0">
                    {Math.round(d.confidence * 100)}%
                  </span>
                </li>
              ))}
              {detections.length > 10 && (
                <li className="text-xs text-slate-500 text-center pt-1">
                  …và {detections.length - 10} phát hiện khác (confidence thấp hơn)
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Damage Breakdown — tổng hợp 5 part */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Phân tích hư hỏng tổng hợp</p>
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

      {/* Cách AI ra giá này — luôn bung sẵn, 3 bước minh bạch */}
      {data.pMarket > 0 && (
        <PriceTransparencyPanel data={data} />
      )}

      {/* CTA */}
      {data.pFinal > 0 && !readOnly && onUsePrice && (
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

function getConfidenceDotColor(conf: number): string {
  if (conf >= 0.7) return 'bg-red-500'
  if (conf >= 0.5) return 'bg-orange-500'
  if (conf >= 0.35) return 'bg-yellow-500'
  return 'bg-slate-300'
}

interface BboxOverlayImageProps {
  url: string
  imageMeta?: ImageMeta
  detections: DamageDetection[]
}

function BboxOverlayImage({ url, imageMeta, detections }: BboxOverlayImageProps) {
  // Render từng bbox bằng absolute-positioned div, percent dựa trên image_width/height
  const w = imageMeta?.width ?? 0
  const h = imageMeta?.height ?? 0

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="block w-full h-auto" />
      {w > 0 && h > 0 &&
        detections.map((d, idx) => {
          const left = (d.bbox.xMin / w) * 100
          const top = (d.bbox.yMin / h) * 100
          const width = ((d.bbox.xMax - d.bbox.xMin) / w) * 100
          const height = ((d.bbox.yMax - d.bbox.yMin) / h) * 100
          const color =
            d.confidence >= 0.7
              ? 'border-red-500 bg-red-500/10'
              : d.confidence >= 0.5
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-yellow-500 bg-yellow-500/10'
          const labelColor =
            d.confidence >= 0.7
              ? 'bg-red-500'
              : d.confidence >= 0.5
                ? 'bg-orange-500'
                : 'bg-yellow-500'
          return (
            <div
              key={`bbox-${idx}`}
              className={`absolute border-2 ${color} rounded-sm`}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}%`,
                height: `${height}%`,
              }}
            >
              <span
                className={`absolute -top-5 left-0 ${labelColor} text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap`}
              >
                {d.labelDisplay} {Math.round(d.confidence * 100)}%
              </span>
            </div>
          )
        })}
      {detections.length === 0 && (
        <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
          <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            ✓ Không phát hiện hư hỏng
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Panel minh bạch cách AI ra giá — 3 bước hiển thị mặc định.
 * KHÔNG dùng accordion: hội đồng chấm cần thấy ngay không phải click.
 */
function PriceTransparencyPanel({ data }: { data: AiPricingData }) {
  const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  const totalDeduction = Math.round((1 - data.pFinal / Math.max(data.pMarket, 1)) * 1000) / 10
  const deductionAmount = data.pMarket - data.pFinal
  // Lọc các phần có khấu hao đáng kể (>= 0.1%) để tránh rác
  const significantBreakdown = data.damageBreakdown
    .filter((d) => d.deductionPercent >= 0.1)
    .sort((a, b) => b.deductionPercent - a.deductionPercent)

  return (
    <div className="rounded-2xl bg-white border border-purple-100 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-base text-primary">calculate</span>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Cách AI ra giá này — minh bạch 3 bước
        </p>
      </div>

      {/* STEP 1 — Giá thị trường */}
      <div className="flex gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-black">
          1
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-700">Giá gốc thị trường</p>
            <p className="font-headline font-extrabold text-lg text-slate-900 tracking-tight">
              {formatVND(data.pMarket)}
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Median {data.dataPoints} tin đăng cùng dòng máy
            {data.marketSummary ? ` · ${data.marketSummary}` : ''}
          </p>

          {/* Bảng samples từ Chợ Tốt */}
          <MarketSamplesTable
            samples={data.marketSamples ?? []}
            dataSource={data.dataSource}
          />
        </div>
      </div>

      {/* Connector arrow */}
      <div className="flex items-center gap-2 pl-3 text-slate-300">
        <span className="material-symbols-outlined text-base">arrow_downward</span>
        <span className="text-[11px] font-mono text-slate-400">
          P_final = P_market × ∏(1 − w<sub>i</sub> × d<sub>i</sub>)
        </span>
      </div>

      {/* STEP 2 — Khấu hao theo từng phần */}
      <div className="flex gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-xs font-black">
          2
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-700">Trừ khấu hao theo hư hỏng</p>
            <p className="font-headline font-extrabold text-lg text-rose-600 tracking-tight">
              −{totalDeduction}%
              <span className="text-xs font-bold text-rose-500/80 ml-1">
                ({formatVND(deductionAmount)})
              </span>
            </p>
          </div>

          {significantBreakdown.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {significantBreakdown.map((d) => (
                <li
                  key={d.part}
                  className="flex items-center justify-between gap-2 text-xs bg-rose-50/50 border border-rose-100 rounded-lg px-2.5 py-1.5"
                >
                  <span className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="material-symbols-outlined text-sm text-rose-500 shrink-0">
                      {PART_ICONS[d.part] ?? 'info'}
                    </span>
                    <span className="font-medium text-slate-700 truncate">
                      {PART_LABELS[d.part] ?? d.part}
                    </span>
                    <span className="text-slate-400 shrink-0">
                      · severity {Math.round(d.severity * 100)}% × trọng số {Math.round(d.weight * 100)}%
                    </span>
                  </span>
                  <span className="font-bold text-rose-600 shrink-0">
                    −{d.deductionPercent}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-emerald-600 font-medium">
              Máy gần như nguyên vẹn, không phát hiện hư hỏng đáng kể
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 pl-3 text-slate-300">
        <span className="material-symbols-outlined text-base">arrow_downward</span>
      </div>

      {/* STEP 3 — Giá đề xuất */}
      <div className="flex gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-black">
          3
        </div>
        <div className="flex-1 min-w-0 rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-200 p-3">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-800">Giá đề xuất cuối cùng</p>
            <p className="font-headline font-black text-2xl text-primary tracking-tight">
              {formatVND(data.pFinal)}
            </p>
          </div>
          {data.pFinal > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              Khoảng giá hợp lý:{' '}
              <span className="font-semibold text-slate-700">
                {formatVND(data.priceRange.low)} – {formatVND(data.priceRange.high)}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Bảng các tin đăng tham chiếu từ Chợ Tốt — dữ liệu thật.
 * Default hiện 5 tin đầu, click "Xem tất cả" để bung.
 */
function MarketSamplesTable({
  samples,
  dataSource,
}: {
  samples: MarketSample[]
  dataSource?: AiPricingData['dataSource']
}) {
  const [expanded, setExpanded] = useState(false)
  const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)

  if (samples.length === 0) {
    return (
      <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-xs text-slate-500">
        Chưa có tin đăng tham chiếu (Chợ Tốt block hoặc model quá hiếm).
      </div>
    )
  }

  const visible = expanded ? samples : samples.slice(0, 5)
  const sourceBadge: Record<string, { label: string; className: string }> = {
    live_scrape: { label: 'Scrape live · Chợ Tốt', className: 'bg-emerald-100 text-emerald-700' },
    mongodb_cache: { label: 'Cache 24h · MongoDB', className: 'bg-blue-100 text-blue-700' },
    mock_fallback: { label: 'Mock fallback', className: 'bg-amber-100 text-amber-700' },
    unavailable: { label: 'Không có dữ liệu', className: 'bg-rose-100 text-rose-700' },
  }
  const badge = sourceBadge[dataSource ?? 'unavailable']

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-slate-500">database</span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
            {samples.length} tin tham chiếu
          </span>
          <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        {samples.length > 5 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[11px] font-bold text-primary hover:underline"
          >
            {expanded ? 'Thu gọn' : `Xem tất cả ${samples.length}`}
          </button>
        )}
      </div>
      <div className="divide-y divide-slate-100 max-h-80 overflow-auto">
        {visible.map((s, i) => (
          <a
            key={s.url || i}
            href={s.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 hover:bg-white transition-colors group"
          >
            <span className="text-[10px] font-mono text-slate-400 w-5 shrink-0">#{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-primary">
                {s.title}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {s.location || '—'}
                {s.postedAtText ? ` · ${s.postedAtText}` : ''}
              </p>
            </div>
            <span className="text-xs font-headline font-extrabold text-slate-900 shrink-0 tabular-nums">
              {formatVND(s.price)}
            </span>
            {s.url && (
              <span className="material-symbols-outlined text-sm text-slate-300 group-hover:text-primary shrink-0">
                open_in_new
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
