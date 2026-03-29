import mongoose, { Schema, Document } from 'mongoose'

export interface IDamageItem {
  part: string        // 'screen' | 'battery' | 'body' | 'camera' | 'other'
  severity: number    // d_i: 0.0 (nguyên vẹn) → 1.0 (hỏng hoàn toàn)
  description: string // Mô tả chi tiết từ Gemini
  weight: number      // w_i: trọng số của từng phần
}

export interface IAiAnalysisLog extends Document {
  listingId: string        // ID listing trong PostgreSQL
  imageUrls: string[]      // Các URL ảnh đã phân tích
  detectedModel: string    // Model máy Gemini nhận diện được
  damageItems: IDamageItem[]
  confidenceScore: number  // 0.0 → 1.0
  pFinal: number           // Giá đề xuất cuối cùng (VND)
  pMarket: number          // Giá thị trường tham chiếu (VND)
  geminiRawResponse: string // Raw JSON response từ Gemini (để debug)
  processedAt: Date
}

const DamageItemSchema = new Schema<IDamageItem>(
  {
    part:        { type: String, required: true },
    severity:    { type: Number, required: true, min: 0, max: 1 },
    description: { type: String, default: '' },
    weight:      { type: Number, required: true },
  },
  { _id: false },
)

const AiAnalysisLogSchema = new Schema<IAiAnalysisLog>(
  {
    listingId:          { type: String, required: true, index: true },
    imageUrls:          [{ type: String }],
    detectedModel:      { type: String, default: '' },
    damageItems:        [DamageItemSchema],
    confidenceScore:    { type: Number, default: 0 },
    pFinal:             { type: Number, default: 0 },
    pMarket:            { type: Number, default: 0 },
    geminiRawResponse:  { type: String, default: '' },
    processedAt:        { type: Date, default: Date.now, index: true },
  },
  { collection: 'ai_analysis_log' },
)

export const AiAnalysisLogModel = mongoose.model<IAiAnalysisLog>(
  'AiAnalysisLog',
  AiAnalysisLogSchema,
)
