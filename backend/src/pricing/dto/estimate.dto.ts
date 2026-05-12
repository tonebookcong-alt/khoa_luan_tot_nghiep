import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator'
import { Transform } from 'class-transformer'

export class EstimateRequestDto {
  @ApiProperty({ example: 'Apple' })
  @IsString()
  brand: string

  @ApiProperty({ example: 'iPhone 14 Pro Max' })
  @IsString()
  model: string

  @ApiPropertyOptional({ example: 'listing_id_here' })
  @IsOptional()
  @IsString()
  listingId?: string

  @ApiPropertyOptional({
    description: 'Pin còn (%), 0-100. Nếu thiếu, dùng mặc định severity 0.10.',
    example: '85',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : Number(value)))
  @IsNumber({}, { message: 'Pin phải là số' })
  @Min(0, { message: 'Pin không thể âm' })
  @Max(100, { message: 'Pin không vượt quá 100%' })
  batteryHealth?: number
}

// ---- Response types (không dùng class-validator, chỉ để Swagger) ----

export interface DamageBreakdownItem {
  part: string
  severity: number      // 0.0 → 1.0
  description: string
  weight: number
  deductionPercent: number // (w_i × d_i) × 100
}

export interface PriceRange {
  low: number
  high: number
}

export interface DamageDetectionDto {
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

export interface ImageMetaDto {
  index: number
  width: number
  height: number
  detectionCount: number
}

export interface MarketSampleDto {
  source: string
  url: string
  title: string
  price: number
  location: string
  postedAtText: string
  scrapedAt: string
}

export interface EstimateResponseDto {
  pMarket: number
  pFinal: number
  priceRange: PriceRange
  damageBreakdown: DamageBreakdownItem[]
  confidenceScore: number
  detectedModel: string
  overallCondition: string
  summary: string
  marketSummary: string
  dataPoints: number
  // Mới — chi tiết AI phân tích
  detectedGeneration: string | null
  claimedModel: string
  claimedMatches: boolean
  damageDetections: DamageDetectionDto[]
  images: ImageMetaDto[]
  // Mới — danh sách tin tham chiếu cho minh bạch giá thị trường
  marketSamples: MarketSampleDto[]
  dataSource: 'live_scrape' | 'mongodb_cache' | 'mock_fallback' | 'unavailable'
}
