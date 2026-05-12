import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface MarketSample {
  source: string
  url: string
  title: string
  price: number
  location: string
  postedAtText: string
  scrapedAt: string
}

export interface MarketPriceResult {
  pMarket: number
  priceRange: { low: number; high: number }
  marketSummary: string
  dataPoints: number
  marketSamples: MarketSample[]
  dataSource: 'live_scrape' | 'mongodb_cache' | 'mock_fallback' | 'unavailable'
}

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name)

  constructor(private config: ConfigService) {}

  async getMarketPrice(brand: string, model: string): Promise<MarketPriceResult> {
    const aiServiceUrl = this.config.get<string>('AI_SERVICE_URL') ?? 'http://localhost:3002'

    try {
      const params = new URLSearchParams({ brand, model })
      // Tăng timeout vì scraping live có thể mất 5-10s
      const response = await fetch(`${aiServiceUrl}/market/price?${params.toString()}`, {
        signal: AbortSignal.timeout(20_000),
      })

      if (!response.ok) {
        throw new Error(`ai-service responded ${response.status}`)
      }

      const data = (await response.json()) as Partial<MarketPriceResult> & {
        pMarket: number
      }

      if (data.pMarket === 0) {
        return {
          pMarket: 0,
          priceRange: { low: 0, high: 0 },
          marketSummary: data.marketSummary ?? 'Không có dữ liệu thị trường',
          dataPoints: 0,
          marketSamples: [],
          dataSource: data.dataSource ?? 'unavailable',
        }
      }

      return {
        pMarket: data.pMarket,
        priceRange: data.priceRange ?? { low: 0, high: 0 },
        marketSummary: data.marketSummary ?? '',
        dataPoints: data.dataPoints ?? 0,
        marketSamples: data.marketSamples ?? [],
        dataSource: data.dataSource ?? 'unavailable',
      }
    } catch (err) {
      this.logger.warn(`Market price fetch failed: ${(err as Error).message}`)
      return {
        pMarket: 0,
        priceRange: { low: 0, high: 0 },
        marketSummary: 'Không thể lấy giá thị trường',
        dataPoints: 0,
        marketSamples: [],
        dataSource: 'unavailable',
      }
    }
  }
}
