import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { getMarketPrice } from './market-scraper.service'

export const marketScraperRouter = Router()

const QuerySchema = z.object({
  brand: z.string().min(1),
  model: z.string().min(1),
})

// GET /market/price?brand=Apple&model=iPhone+14+Pro+Max
// Trả về median + samples list (full payload)
marketScraperRouter.get('/price', async (req: Request, res: Response) => {
  const parsed = QuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'brand và model là bắt buộc' })
    return
  }

  const result = await getMarketPrice(parsed.data.brand, parsed.data.model)
  res.json(result)
})

// GET /market/samples?brand=Apple&model=iPhone+14+Pro+Max&limit=30
// Endpoint dành riêng cho UI hiện danh sách tin tham chiếu (frontend gọi trực tiếp được)
marketScraperRouter.get('/samples', async (req: Request, res: Response) => {
  const parsed = QuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'brand và model là bắt buộc' })
    return
  }
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '30'), 10) || 30))
  const result = await getMarketPrice(parsed.data.brand, parsed.data.model)
  res.json({
    brand: result.brand,
    model: result.model,
    pMarket: result.pMarket,
    priceRange: result.priceRange,
    dataPoints: result.dataPoints,
    dataSource: result.dataSource,
    samples: result.marketSamples.slice(0, limit),
  })
})
