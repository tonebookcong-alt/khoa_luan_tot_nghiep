import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { getRedisClient } from '../shared/db'
import { MarketPriceRawModel, IMarketPriceRaw } from '../shared/schemas/market-price-raw.schema'
import { findMarketPrice, toModelSlug } from './mock-data'
import { scrapeChoTot, ChoTotListing } from './chotot-scraper'

const REDIS_TTL_SECONDS = 24 * 60 * 60 // 24 giờ
const MIN_SAMPLES = 8                  // dưới ngưỡng này → trigger scrape mới
const MAX_SAMPLES = 50                 // số sample trả về tối đa
const FRESHNESS_HOURS = 24             // dữ liệu mới hơn ngưỡng này coi là OK

export interface MarketSample {
  source: string
  url: string
  title: string
  price: number
  location: string
  postedAtText: string
  scrapedAt: string  // ISO date
}

export interface MarketPriceResult {
  brand: string
  model: string
  pMarket: number
  priceRange: { low: number; high: number }
  marketSummary: string
  dataPoints: number
  marketSamples: MarketSample[]
  cachedAt: string
  dataSource: 'live_scrape' | 'mongodb_cache' | 'mock_fallback'
}

/**
 * Định giá thị trường:
 * 1. Redis cache → trả luôn nếu hit
 * 2. MongoDB samples mới (< 24h) → tính median + return
 * 3. Scrape Chợ Tốt live → save MongoDB → return
 * 4. Mock fallback nếu scrape fail (luôn còn data để demo)
 */
export async function getMarketPrice(
  brand: string,
  model: string,
): Promise<MarketPriceResult> {
  const cacheKey = `market_price:${toModelSlug(brand, model)}`
  const redis = getRedisClient()

  // 1. Redis cache hit?
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached) as MarketPriceResult
    }
  } catch {
    // Redis down — continue
  }

  // 2. MongoDB samples mới?
  const mongoSamples = await loadFreshSamples(brand, model)
  if (mongoSamples.length >= MIN_SAMPLES) {
    const result = await buildResultFromSamples(brand, model, mongoSamples, 'mongodb_cache')
    void cacheToRedis(cacheKey, result, redis)
    return result
  }

  // 3. Scrape live từ Chợ Tốt
  let scraped: ChoTotListing[] = []
  try {
    scraped = await scrapeChoTot(brand, model, 2) // 2 trang ~40 tin
    console.log(`[market-scraper] scraped ${scraped.length} listings for ${brand} ${model}`)
  } catch (err) {
    console.warn('[market-scraper] scrape failed:', (err as Error).message)
  }

  if (scraped.length > 0) {
    void persistSamples(brand, model, scraped) // save MongoDB non-blocking

    const samples = scraped.map(toMarketSample)
    const merged = mergeSamples(mongoSamples, samples).slice(0, MAX_SAMPLES)
    const result = await buildResultFromSamples(brand, model, merged, 'live_scrape')
    void cacheToRedis(cacheKey, result, redis)
    return result
  }

  // 4. Fallback mock (đảm bảo demo không vỡ nếu Chợ Tốt block)
  if (mongoSamples.length > 0) {
    // Có sample cũ trong DB → vẫn dùng (dù < MIN_SAMPLES)
    return await buildResultFromSamples(brand, model, mongoSamples, 'mongodb_cache')
  }

  return buildMockFallback(brand, model)
}

async function loadFreshSamples(brand: string, model: string): Promise<MarketSample[]> {
  try {
    const since = new Date(Date.now() - FRESHNESS_HOURS * 60 * 60 * 1000)
    const docs = await MarketPriceRawModel.find({
      brand: { $regex: new RegExp(`^${escapeRegex(brand)}$`, 'i') },
      model: { $regex: new RegExp(escapeRegex(model), 'i') },
      scrapedAt: { $gte: since },
      price: { $gt: 0 },
    })
      .sort({ scrapedAt: -1 })
      .limit(MAX_SAMPLES)
      .lean<IMarketPriceRaw[]>()

    return docs.map((d) => ({
      source: d.source,
      url: extractUrlFromRaw(d.rawText) || '',
      title: extractTitleFromRaw(d.rawText) || `${d.brand} ${d.model}`,
      price: d.price,
      location: extractLocationFromRaw(d.rawText) || '',
      postedAtText: '',
      scrapedAt: d.scrapedAt.toISOString(),
    }))
  } catch {
    return []
  }
}

async function persistSamples(
  brand: string,
  model: string,
  samples: ChoTotListing[],
): Promise<void> {
  try {
    const docs = samples.map((s) => ({
      brand,
      model,
      source: 'chotot.com',
      price: s.price,
      condition: 'unknown', // Chợ Tốt không có field cố định cho tình trạng
      rawText: JSON.stringify({
        url: s.url,
        title: s.title,
        location: s.location,
        postedAtText: s.postedAtText,
      }),
      scrapedAt: s.scrapedAt,
    }))
    await MarketPriceRawModel.insertMany(docs, { ordered: false })
  } catch {
    // MongoDB unavailable hoặc duplicate key — bỏ qua
  }
}

function toMarketSample(c: ChoTotListing): MarketSample {
  return {
    source: c.source,
    url: c.url,
    title: c.title,
    price: c.price,
    location: c.location,
    postedAtText: c.postedAtText,
    scrapedAt: c.scrapedAt.toISOString(),
  }
}

function mergeSamples(a: MarketSample[], b: MarketSample[]): MarketSample[] {
  const seen = new Set<string>()
  const out: MarketSample[] = []
  for (const s of [...b, ...a]) {
    if (!s.url || seen.has(s.url)) continue
    seen.add(s.url)
    out.push(s)
  }
  return out
}

async function buildResultFromSamples(
  brand: string,
  model: string,
  samples: MarketSample[],
  dataSource: MarketPriceResult['dataSource'],
): Promise<MarketPriceResult> {
  // Lọc outlier: bỏ giá < 1tr (phụ kiện) và > 200tr (giá ảo)
  const validPrices = samples
    .map((s) => s.price)
    .filter((p) => p >= 1_000_000 && p <= 200_000_000)
    .sort((a, b) => a - b)

  if (validPrices.length === 0) {
    return buildMockFallback(brand, model)
  }

  const pMarket = median(validPrices)
  const p10 = percentile(validPrices, 10)
  const p90 = percentile(validPrices, 90)
  const marketSummary = await generateMarketSummary(brand, model, pMarket, { low: p10, high: p90 }, validPrices.length)

  return {
    brand,
    model,
    pMarket,
    priceRange: { low: p10, high: p90 },
    marketSummary,
    dataPoints: validPrices.length,
    marketSamples: samples.slice(0, MAX_SAMPLES),
    cachedAt: new Date().toISOString(),
    dataSource,
  }
}

function buildMockFallback(brand: string, model: string): MarketPriceResult {
  // Dùng mock-data.ts như emergency fallback (Chợ Tốt block, MongoDB chết, không có data)
  const basePrice = findMarketPrice(brand, model)
  if (!basePrice) {
    return {
      brand,
      model,
      pMarket: 0,
      priceRange: { low: 0, high: 0 },
      marketSummary: `Chưa có dữ liệu thị trường cho ${brand} ${model}.`,
      dataPoints: 0,
      marketSamples: [],
      cachedAt: new Date().toISOString(),
      dataSource: 'mock_fallback',
    }
  }
  return {
    brand,
    model,
    pMarket: basePrice,
    priceRange: { low: Math.round(basePrice * 0.92), high: Math.round(basePrice * 1.08) },
    marketSummary: `Giá tham khảo ${formatVND(basePrice)} (dữ liệu mock — chưa thể kết nối nguồn thị trường).`,
    dataPoints: 0,
    marketSamples: [],
    cachedAt: new Date().toISOString(),
    dataSource: 'mock_fallback',
  }
}

async function cacheToRedis(
  key: string,
  result: MarketPriceResult,
  redis: ReturnType<typeof getRedisClient>,
): Promise<void> {
  try {
    await redis.setex(key, REDIS_TTL_SECONDS, JSON.stringify(result))
  } catch {
    // Redis down
  }
}

// ── Math helpers ─────────────────────────────────────────────────────────

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ── String helpers cho rawText (legacy) ──────────────────────────────────

function extractUrlFromRaw(raw: string): string | null {
  try {
    const obj = JSON.parse(raw) as { url?: string }
    return obj.url ?? null
  } catch {
    return null
  }
}
function extractTitleFromRaw(raw: string): string | null {
  try {
    const obj = JSON.parse(raw) as { title?: string }
    return obj.title ?? null
  } catch {
    return null
  }
}
function extractLocationFromRaw(raw: string): string | null {
  try {
    const obj = JSON.parse(raw) as { location?: string }
    return obj.location ?? null
  } catch {
    return null
  }
}

// ── Gemini summary ───────────────────────────────────────────────────────

async function generateMarketSummary(
  brand: string,
  model: string,
  pMarket: number,
  priceRange: { low: number; high: number },
  dataPoints: number,
): Promise<string> {
  const apiKey = process.env['GEMINI_API_KEY']

  if (!apiKey) {
    return `Median ${formatVND(pMarket)} dựa trên ${dataPoints} tin đăng Chợ Tốt, dải ${formatVND(priceRange.low)} – ${formatVND(priceRange.high)}.`
  }

  try {
    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-flash',
      apiKey,
      temperature: 0.3,
      maxOutputTokens: 120,
    })

    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'Bạn là chuyên gia phân tích thị trường điện thoại cũ Việt Nam. Viết 1 câu ngắn (≤25 từ), tiếng Việt, dùng tự nhiên — không dùng dấu hai chấm hay markdown.',
      ],
      [
        'human',
        `Tóm tắt giá {brand} {model} từ {dataPoints} tin đăng Chợ Tốt: median {pMarket}, dải {pLow}-{pHigh}.`,
      ],
    ])

    const chain = prompt.pipe(llm).pipe(new StringOutputParser())
    const summary = await chain.invoke({
      brand,
      model,
      dataPoints: String(dataPoints),
      pMarket: formatVND(pMarket),
      pLow: formatVND(priceRange.low),
      pHigh: formatVND(priceRange.high),
    })

    return summary.trim().replace(/^["']|["']$/g, '')
  } catch {
    return `Median ${formatVND(pMarket)} từ ${dataPoints} tin đăng Chợ Tốt, dải ${formatVND(priceRange.low)} – ${formatVND(priceRange.high)}.`
  }
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}
