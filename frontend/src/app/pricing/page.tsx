'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, X, Sparkles, ArrowRight } from 'lucide-react';
import { api } from '@/lib/axios';
import { AiPricingResult } from '@/components/listings/AiPricingResult';
import { PhotoGuide } from '@/components/listings/PhotoGuide';
import { Button } from '@/components/ui/button';
import { BRANDS, PHONE_MODELS } from '@/lib/phone-models';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AiPricingData {
  pMarket: number;
  pFinal: number;
  priceRange: { low: number; high: number };
  damageBreakdown: {
    part: string;
    severity: number;
    description: string;
    weight: number;
    deductionPercent: number;
  }[];
  confidenceScore: number;
  detectedModel: string;
  overallCondition: string;
  summary: string;
  marketSummary: string;
  dataPoints: number;
  imageType?: 'real_device' | 'marketing' | 'unclear';
  detectedGeneration?: string | null;
  claimedModel?: string;
  claimedMatches?: boolean;
}

const MAX_IMAGES = 6;

export default function PricingPage() {
  const router = useRouter();
  const [brand, setBrand] = useState('Apple');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState(''); // Khi user chọn "Khác"
  const [batteryHealth, setBatteryHealth] = useState<string>('');
  const [batteryError, setBatteryError] = useState('');

  const validateBattery = (raw: string): string => {
    if (!raw.trim()) return ''; // ô tùy chọn, để trống ok
    const n = Number(raw);
    if (!Number.isFinite(n)) return 'Pin phải là số';
    if (n < 0) return 'Pin không thể âm';
    if (n > 100) return 'Pin không vượt quá 100%';
    return '';
  };

  const modelOptions = PHONE_MODELS[brand] ?? ['Khác'];
  const isCustomModel = model === 'Khác';
  const effectiveModel = isCustomModel ? customModel.trim() : model;
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AiPricingData | null>(null);
  const [error, setError] = useState('');

  // Sync previews with images
  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  const isApple = brand === 'Apple';

  const handleAddFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, MAX_IMAGES - images.length);
    setImages((prev) => [...prev, ...arr].slice(0, MAX_IMAGES));
    setResult(null);
    setError('');
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setResult(null);
  };

  const canAnalyze = useMemo(
    () => images.length > 0 && brand.trim() && effectiveModel.trim() && !analyzing && !batteryError,
    [images, brand, effectiveModel, analyzing, batteryError],
  );

  const onAnalyze = async () => {
    // Re-check battery ngay trước khi gọi API (phòng user submit khi đang có lỗi)
    const bErr = validateBattery(batteryHealth);
    if (bErr) {
      setBatteryError(bErr);
      setError(bErr);
      return;
    }
    if (!canAnalyze) {
      if (images.length === 0) setError('Vui lòng tải lên ít nhất 1 ảnh');
      else if (!effectiveModel.trim()) setError('Vui lòng chọn hoặc nhập model điện thoại');
      return;
    }
    setError('');
    setResult(null);
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append('brand', brand);
      fd.append('model', effectiveModel);
      const battery = parseFloat(batteryHealth);
      if (!Number.isNaN(battery) && battery > 0 && battery <= 100) {
        fd.append('batteryHealth', String(battery));
      }
      images.forEach((f) => fd.append('images', f));

      const res = await api.post<AiPricingData>('/pricing/estimate', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      const status = e.response?.status;
      if (status === 401) {
        setError('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.');
      } else {
        setError(`Định giá AI thất bại (${status ?? 'network'}). Vui lòng thử lại.`);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const goToCreate = () => {
    // Truyền data cơ bản qua querystring để form đăng tin pre-fill
    const params = new URLSearchParams({ brand, model: effectiveModel });
    if (result?.pFinal) params.set('price', String(result.pFinal));
    router.push(`/listings/create?${params.toString()}`);
  };

  return (
    <div className="pt-24 px-6 md:px-8 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 mb-3 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-black uppercase tracking-widest text-primary">
            Định giá AI · Gemini Vision + YOLO
          </span>
        </div>
        <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-[#1E1B4B] tracking-tight leading-tight">
          Đoán đúng giá điện thoại trong <span className="text-primary">8 giây</span>.
        </h1>
        <p className="text-slate-500 mt-2 text-sm md:text-base max-w-2xl">
          Tải ảnh máy lên, AI phân tích trầy xước, kiểm tra giá thị trường và đề xuất khoảng giá hợp lý. Miễn phí, không cần đăng tin.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-[2rem] border border-purple-100 shadow-sm p-6 md:p-8 mb-8">
        {/* Step 1: Images */}
        <div className="mb-6">
          <Label className="text-sm font-bold text-[#1E1B4B] mb-2 block">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-white text-[10px] font-black mr-2">1</span>
            Tải ảnh máy ({images.length}/{MAX_IMAGES})
          </Label>
          <PhotoGuide className="mb-3" />

          {previews.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
              {previews.map((url, i) => (
                <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-purple-100 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`preview ${i}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-purple-200 hover:border-primary hover:bg-purple-50 transition-colors flex items-center justify-center cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleAddFiles(e.target.files)}
                  />
                  <Upload className="h-5 w-5 text-purple-400" />
                </label>
              )}
            </div>
          ) : (
            <label className="block border-2 border-dashed border-purple-200 hover:border-primary rounded-2xl py-10 px-4 text-center cursor-pointer hover:bg-purple-50/50 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleAddFiles(e.target.files)}
              />
              <Upload className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-700">Bấm để chọn ảnh hoặc kéo thả vào đây</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG · tối đa {MAX_IMAGES} ảnh</p>
            </label>
          )}
        </div>

        {/* Step 2: Phone info */}
        <div className="mb-6">
          <Label className="text-sm font-bold text-[#1E1B4B] mb-3 block">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-white text-[10px] font-black mr-2">2</span>
            Thông tin máy
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="brand" className="text-xs text-slate-500 mb-1 block">Thương hiệu</Label>
              <select
                id="brand"
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setModel('');
                  setCustomModel('');
                  setResult(null);
                }}
                className="flex h-10 w-full rounded-xl border border-purple-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="model" className="text-xs text-slate-500 mb-1 block">Model *</Label>
              <select
                id="model"
                value={model}
                onChange={(e) => { setModel(e.target.value); setResult(null); }}
                className="flex h-10 w-full rounded-xl border border-purple-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">— Chọn model —</option>
                {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {isCustomModel && (
                <Input
                  className="mt-2"
                  value={customModel}
                  onChange={(e) => { setCustomModel(e.target.value); setResult(null); }}
                  placeholder="Nhập tên model (vd: iPhone 13 Pro Max)"
                  autoFocus
                />
              )}
            </div>
            {isApple && (
              <div>
                <Label htmlFor="battery" className="text-xs text-slate-500 mb-1 block">
                  Pin còn (%) <span className="text-slate-400">— tùy chọn</span>
                </Label>
                <Input
                  id="battery"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  step={1}
                  value={batteryHealth}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBatteryHealth(v);
                    setBatteryError(validateBattery(v));
                  }}
                  onBlur={(e) => setBatteryError(validateBattery(e.target.value))}
                  placeholder="VD: 85"
                  aria-invalid={!!batteryError}
                  className={batteryError ? 'border-red-400 focus:ring-red-200' : ''}
                />
                {batteryError ? (
                  <p className="text-[11px] text-red-600 mt-1">{batteryError}</p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Apple coi 80% là ngưỡng nên thay pin. AI sẽ trừ giá theo % chai.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Analyze button */}
        <Button
          onClick={onAnalyze}
          disabled={!canAnalyze}
          size="lg"
          className="w-full gap-2 h-12 text-base"
        >
          {analyzing
            ? <><Loader2 className="h-5 w-5 animate-spin" /> Đang phân tích ảnh...</>
            : <><Sparkles className="h-5 w-5" /> Định giá bằng AI</>}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <>
          <AiPricingResult data={result} imageUrls={previews} />

          {/* CTA after pricing */}
          <div
            className="mt-8 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 60%, #1E1B4B 100%)' }}
          >
            <div className="absolute -top-12 -right-12 w-60 h-60 bg-white/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
              <div>
                <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-white/15 border border-white/20 rounded-full px-3 py-1 mb-3">
                  Đã có giá đề xuất
                </span>
                <h3 className="font-headline font-extrabold text-xl md:text-2xl tracking-tight">
                  Bán luôn với giá AI gợi ý?
                </h3>
                <p className="text-white/70 text-sm mt-1 max-w-md">
                  Tạo tin đăng với thông tin và giá đã có, đính kèm phân tích AI để tăng độ tin cậy.
                </p>
              </div>
              <button
                onClick={goToCreate}
                className="inline-flex items-center justify-center gap-2 bg-white text-[#1E1B4B] font-bold rounded-full px-6 py-3.5 hover:bg-purple-50 transition-colors shadow-2xl whitespace-nowrap"
              >
                Đăng tin với giá này
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Empty-state hint when no result yet */}
      {!result && !analyzing && (
        <div className="text-center text-xs text-slate-400">
          Bạn không cần đăng tin — kết quả định giá là miễn phí và chỉ hiển thị cho riêng bạn.
          {' '}
          <Link href="/listings/create" className="text-primary font-bold hover:underline">
            Hoặc đăng tin ngay (kèm AI)
          </Link>
        </div>
      )}
    </div>
  );
}
