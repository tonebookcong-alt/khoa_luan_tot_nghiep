import mongoose, { Schema, Document } from 'mongoose'

export interface IMarketPriceRaw extends Document {
  brand: string
  model: string
  source: string       // URL nguồn hoặc tên nguồn
  price: number        // Giá (VND)
  condition: string    // Tình trạng máy (mô tả thô)
  rawText: string      // Văn bản gốc thu thập được
  scrapedAt: Date
}

const MarketPriceRawSchema = new Schema<IMarketPriceRaw>(
  {
    brand:     { type: String, required: true, index: true },
    model:     { type: String, required: true, index: true },
    source:    { type: String, required: true },
    price:     { type: Number, required: true },
    condition: { type: String, default: '' },
    rawText:   { type: String, default: '' },
    scrapedAt: { type: Date, default: Date.now, index: true },
  },
  { collection: 'market_price_raw' },
)

// TTL index: tự xóa sau 30 ngày
MarketPriceRawSchema.index({ scrapedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

export const MarketPriceRawModel = mongoose.model<IMarketPriceRaw>(
  'MarketPriceRaw',
  MarketPriceRawSchema,
)
