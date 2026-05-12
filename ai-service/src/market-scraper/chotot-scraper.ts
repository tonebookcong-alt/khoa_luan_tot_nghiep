/**
 * Chợ Tốt scraper — quét tin đăng iPhone/Android từ chotot.com
 * Dùng cheerio + axios (không cần browser binary, đủ vì Chợ Tốt SSR HTML)
 */
import axios from 'axios'
import * as cheerio from 'cheerio'

export interface ChoTotListing {
  source: 'chotot'
  url: string
  title: string
  price: number          // VND, đã parse từ string
  location: string       // Quận/Thành phố
  postedAtText: string   // "2 giờ trước" / "Hôm qua"
  scrapedAt: Date
}

const BASE_URL = 'https://www.chotot.com'
const SEARCH_PATH = '/mua-ban-dien-thoai-toan-quoc'
const TIMEOUT_MS = 12_000
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

/** Parse "8.500.000 đ" / "8tr500" / "8.5 triệu" → 8500000 */
function parsePrice(text: string): number {
  if (!text) return 0
  const t = text.trim().toLowerCase().replace(/\s+/g, ' ')

  // "Đã bán" / "Liên hệ" / không có giá
  if (/(liên hệ|deal|đã bán|đã ẩn|chia sẻ giá)/i.test(t)) return 0

  // "8.500.000 đ" hoặc "8.500.000đ"
  const fullMatch = t.match(/(\d[\d.,]{3,})\s*(?:đ|vnd|₫)?/i)
  if (fullMatch) {
    const digits = fullMatch[1].replace(/[.,]/g, '')
    const v = parseInt(digits, 10)
    if (v >= 500_000 && v <= 200_000_000) return v
  }

  // "8tr500" / "8tr5"
  const trMatch = t.match(/(\d+)\s*tr(?:iệu)?\s*(\d+)?/i)
  if (trMatch) {
    const triệu = parseInt(trMatch[1], 10)
    const lẻ = trMatch[2] ? parseInt(trMatch[2], 10) : 0
    // "8tr5" → 8.500.000, "8tr500" → 8.500.000
    const lẻNorm = trMatch[2] && trMatch[2].length === 1 ? lẻ * 100_000 : lẻ * 1000
    return triệu * 1_000_000 + lẻNorm
  }

  return 0
}

function buildSearchUrl(brand: string, model: string, page = 1): string {
  // Chợ Tốt search: ?q=...&page=1
  // Brand không cần cho vào keyword vì người Việt search theo model trực tiếp
  // (vd "iPhone 14 Pro Max" không cần "Apple")
  const keyword = `${brand} ${model}`
    .replace(/\s+/g, ' ')
    .trim()
  const params = new URLSearchParams({ q: keyword })
  if (page > 1) params.set('page', String(page))
  return `${BASE_URL}${SEARCH_PATH}?${params.toString()}`
}

/**
 * Scrape Chợ Tốt — trả về danh sách tin đăng đã parse.
 * @param brand vd "Apple", "Samsung"
 * @param model vd "iPhone 14 Pro Max", "Galaxy S24 Ultra"
 * @param maxPages số trang search muốn lấy (mỗi trang ~20 tin)
 */
export async function scrapeChoTot(
  brand: string,
  model: string,
  maxPages = 1,
): Promise<ChoTotListing[]> {
  const all: ChoTotListing[] = []

  for (let page = 1; page <= maxPages; page++) {
    const url = buildSearchUrl(brand, model, page)
    try {
      const res = await axios.get<string>(url, {
        timeout: TIMEOUT_MS,
        headers: {
          'User-Agent': USER_AGENT,
          'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
          'Accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        validateStatus: (s) => s >= 200 && s < 400,
      })
      const items = parseListings(res.data, model)
      all.push(...items)

      // Polite delay giữa các trang
      if (page < maxPages) {
        await sleep(800 + Math.random() * 600)
      }

      if (items.length === 0) break // không còn dữ liệu
    } catch (err) {
      console.warn(
        `[chotot-scraper] page ${page} failed:`,
        (err as Error).message,
      )
      break
    }
  }

  return dedupeByUrl(all)
}

/**
 * Parse HTML search page bằng cheerio.
 * Chợ Tốt render listings dưới dạng <li class="AdItem"> hoặc trong __NEXT_DATA__.
 * Strategy: thử cả 2 — DOM trước, fallback đọc Next.js JSON.
 */
function parseListings(html: string, modelKeyword: string): ChoTotListing[] {
  const $ = cheerio.load(html)
  const out: ChoTotListing[] = []
  const now = new Date()
  const keywordLower = modelKeyword.toLowerCase()

  // Strategy 1 — DOM scrape các thẻ <a> đến /mua-ban-...
  $('a[href*="/mua-ban-dien-thoai"]').each((_, el) => {
    const $a = $(el)
    const href = $a.attr('href') || ''
    if (!/\.htm/i.test(href)) return // chỉ lấy link tin chi tiết

    const title = ($a.find('h3, h4, [data-testid*="title"]').first().text() || $a.text())
      .trim()
      .replace(/\s+/g, ' ')

    if (!title || title.length < 8) return
    // Filter relevance: title phải chứa keyword model
    if (!title.toLowerCase().includes(keywordLower.split(' ')[0])) {
      // Quá nghiêm khắc, thay bằng kiểm tra ít nhất 2 từ khoá khớp
      const words = keywordLower.split(' ').filter((w) => w.length >= 2)
      const matches = words.filter((w) => title.toLowerCase().includes(w)).length
      if (matches < Math.min(2, words.length)) return
    }

    // Tìm price — node anh em hoặc con cháu chứa "đ" hoặc "tr"
    const block = $a.closest('li, article, div')
    const priceText =
      block.find('[class*="price"], [data-testid*="price"]').first().text() ||
      block.text().match(/[\d.]+\s*(đ|tr|triệu)/i)?.[0] ||
      ''
    const price = parsePrice(priceText)
    if (price <= 0) return

    const location =
      block.find('[class*="location"], [data-testid*="location"]').first().text().trim() || ''
    const postedAtText =
      block.find('[class*="time"], [data-testid*="time"]').first().text().trim() || ''

    out.push({
      source: 'chotot',
      url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
      title,
      price,
      location: location || 'Việt Nam',
      postedAtText: postedAtText || '',
      scrapedAt: now,
    })
  })

  // Strategy 2 — fallback: parse __NEXT_DATA__ JSON nếu DOM trống
  if (out.length === 0) {
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/,
    )
    if (nextDataMatch) {
      try {
        const json = JSON.parse(nextDataMatch[1]) as Record<string, unknown>
        const ads = extractAdsFromNextData(json)
        for (const ad of ads) {
          if (!ad.subject || !ad.price) continue
          if (
            !ad.subject.toLowerCase().includes(keywordLower.split(' ')[0])
          ) {
            continue
          }
          out.push({
            source: 'chotot',
            url: ad.list_id ? `${BASE_URL}/mua-ban-dien-thoai/${ad.list_id}.htm` : BASE_URL,
            title: ad.subject,
            price: typeof ad.price === 'number' ? ad.price : parsePrice(String(ad.price)),
            location: ad.area_name || ad.region_name || 'Việt Nam',
            postedAtText: ad.list_time ? new Date(ad.list_time).toLocaleString('vi-VN') : '',
            scrapedAt: now,
          })
        }
      } catch {
        // JSON parse fail, ignore
      }
    }
  }

  return out
}

interface ChoTotAdJson {
  list_id?: number
  subject?: string
  price?: number | string
  area_name?: string
  region_name?: string
  list_time?: number
}

/** Đệ quy tìm mảng `ads` hoặc `data` chứa subject+price trong __NEXT_DATA__ */
function extractAdsFromNextData(obj: unknown, depth = 0): ChoTotAdJson[] {
  if (depth > 6 || !obj || typeof obj !== 'object') return []
  const o = obj as Record<string, unknown>

  // Common Chotot keys
  if (Array.isArray(o.ads)) return o.ads as ChoTotAdJson[]
  if (Array.isArray(o.data) && o.data.length > 0 && typeof o.data[0] === 'object') {
    const sample = o.data[0] as Record<string, unknown>
    if ('subject' in sample && ('price' in sample || 'list_id' in sample)) {
      return o.data as ChoTotAdJson[]
    }
  }

  for (const v of Object.values(o)) {
    if (typeof v === 'object' && v !== null) {
      const found = extractAdsFromNextData(v, depth + 1)
      if (found.length > 0) return found
    }
  }
  return []
}

function dedupeByUrl(arr: ChoTotListing[]): ChoTotListing[] {
  const seen = new Set<string>()
  const out: ChoTotListing[] = []
  for (const item of arr) {
    if (seen.has(item.url)) continue
    seen.add(item.url)
    out.push(item)
  }
  return out
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
