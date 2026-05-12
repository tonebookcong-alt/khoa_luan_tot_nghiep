import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'fs'

export interface DamageItem {
  part: string
  severity: number
  description: string
  weight: number
}

export interface DamageDetection {
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

export interface ImageMeta {
  index: number
  width: number
  height: number
  detectionCount: number
}

export interface VisionAnalysisResult {
  detectedModel: string
  overallCondition: string
  damages: DamageItem[]
  confidenceScore: number
  summary: string
  // Mới: dữ liệu chi tiết để frontend render bbox + list
  detectedGeneration: string | null
  claimedModel: string
  claimedMatches: boolean
  damageDetections: DamageDetection[]
  images: ImageMeta[]
}

const GENERATION_DISPLAY: Record<string, string> = {
  gen_6: 'iPhone 6 / 6s / SE 2016',
  gen_7_8: 'iPhone 7 / 8 / SE 2-3',
  gen_x_xs: 'iPhone X / XR / XS',
  gen_11: 'iPhone 11 series',
  gen_12_13: 'iPhone 12 / 13 series',
  gen_14: 'iPhone 14 series',
  gen_15: 'iPhone 15 series',
  gen_16: 'iPhone 16 series',
  gen_17: 'iPhone 17 series',
}

const DAMAGE_LABEL_DISPLAY: Record<string, string> = {
  physical_damage: 'Nứt vỡ / móp',
  scratch: 'Vết trầy xước',
  screen_defect: 'Lỗi màn hình',
  crack: 'Nứt',
  dent: 'Móp',
}

const DAMAGE_WEIGHTS = {
  screen: 0.4,
  battery: 0.2,
  housing: 0.2,
  camera: 0.15,
  other: 0.05,
}

interface YoloBbox {
  x_min: number
  y_min: number
  x_max: number
  y_max: number
}

interface YoloDetection {
  label: string
  confidence: number
  bbox: YoloBbox
}

interface YoloImageDetections {
  image_index: number
  width: number
  height: number
  detections: YoloDetection[]
}

interface YoloDetectResponse {
  detected_generation: string | null
  generation_confidence: number
  claimed_matches: boolean
  damage_scores: {
    screen: number
    body: number
    camera: number
    battery: number
    other: number
  }
  overall_confidence: number
  per_image: YoloImageDetections[]
  damage_per_image?: YoloImageDetections[]
}

const GENERATION_LABELS = new Set([
  'gen_6',
  'gen_7_8',
  'gen_x_xs',
  'gen_11',
  'gen_12_13',
  'gen_14',
  'gen_15',
  'gen_16',
  'gen_17',
])

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name)

  constructor(private config: ConfigService) {}

  async analyzeImages(
    files: Express.Multer.File[],
    modelName: string,
    _brand: string,
    _listingId?: string,
    batteryHealth?: number,
  ): Promise<VisionAnalysisResult> {
    const visionUrl =
      this.config.get<string>('VISION_SERVICE_URL') ?? 'http://localhost:8000'

    if (!files || files.length === 0) {
      this.logger.warn('No files provided to vision service, returning fallback')
      return this.buildFallback(modelName)
    }

    try {
      const formData = new FormData()
      formData.append('claimed_model', modelName)

      for (const file of files) {
        const buffer = fs.existsSync(file.path)
          ? fs.readFileSync(file.path)
          : file.buffer
        const ab = new ArrayBuffer(buffer.byteLength)
        new Uint8Array(ab).set(buffer)
        const blob = new Blob([ab], { type: file.mimetype ?? 'image/jpeg' })
        formData.append('images', blob, file.originalname)
      }

      const response = await fetch(`${visionUrl}/v1/detect`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(20_000),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`vision-service ${response.status}: ${text}`)
      }

      const yolo = (await response.json()) as YoloDetectResponse
      return this.transformYoloResponse(yolo, modelName, batteryHealth)
    } catch (err) {
      this.logger.warn(
        `Vision analysis failed, using fallback: ${(err as Error).message}`,
      )
      return this.buildFallback(modelName, batteryHealth)
    }
  }

  private transformYoloResponse(
    yolo: YoloDetectResponse,
    claimedModel: string,
    batteryHealth?: number,
  ): VisionAnalysisResult {
    const detectedDisplay = yolo.detected_generation
      ? GENERATION_DISPLAY[yolo.detected_generation] ?? claimedModel
      : claimedModel

    const scores = yolo.damage_scores
    const damages: DamageItem[] = [
      {
        part: 'screen',
        severity: clamp01(scores.screen),
        description: describeSeverity('màn hình', scores.screen),
        weight: DAMAGE_WEIGHTS.screen,
      },
      {
        part: 'housing',
        severity: clamp01(scores.body),
        description: describeSeverity('vỏ máy', scores.body),
        weight: DAMAGE_WEIGHTS.housing,
      },
      {
        part: 'camera',
        severity: clamp01(scores.camera),
        description: describeSeverity('camera', scores.camera),
        weight: DAMAGE_WEIGHTS.camera,
      },
      buildBatteryDamage(batteryHealth),
      {
        part: 'other',
        severity: clamp01(scores.other),
        description: describeSeverity('chi tiết khác', scores.other),
        weight: DAMAGE_WEIGHTS.other,
      },
    ]

    const maxVisible = Math.max(
      scores.screen,
      scores.body,
      scores.camera,
      scores.other,
    )
    const overallCondition =
      maxVisible < 0.05
        ? 'LIKE_NEW'
        : maxVisible < 0.2
          ? 'GOOD'
          : maxVisible < 0.5
            ? 'FAIR'
            : 'POOR'

    // Build per-image metadata + body bbox map (for areaRatio)
    const bodyBboxByImage = new Map<number, { area: number; bbox: YoloBbox }>()
    const images: ImageMeta[] = (yolo.per_image ?? []).map((img) => {
      let bodyBox: YoloBbox | undefined
      for (const det of img.detections) {
        if (GENERATION_LABELS.has(det.label)) {
          bodyBox = det.bbox
          break
        }
      }
      if (bodyBox) {
        bodyBboxByImage.set(img.image_index, {
          area: bboxArea(bodyBox),
          bbox: bodyBox,
        })
      }
      return {
        index: img.image_index,
        width: img.width,
        height: img.height,
        detectionCount: 0, // sẽ update sau khi đếm damage
      }
    })

    // Build damageDetections from damage_per_image (preferred) or per_image
    const detectionSource =
      yolo.damage_per_image && yolo.damage_per_image.length > 0
        ? yolo.damage_per_image
        : yolo.per_image
    const damageDetections: DamageDetection[] = []

    for (const img of detectionSource ?? []) {
      const meta = images.find((m) => m.index === img.image_index)
      const imgWidth = img.width || meta?.width || 0
      const imgHeight = img.height || meta?.height || 0
      const bodyEntry = bodyBboxByImage.get(img.image_index)

      for (const det of img.detections) {
        // Chỉ giữ damage labels (bỏ generation labels nếu có lẫn)
        if (GENERATION_LABELS.has(det.label)) continue

        const damageArea = bboxArea(det.bbox)
        const denominator = bodyEntry?.area ?? imgWidth * imgHeight
        const areaRatio = denominator > 0 ? damageArea / denominator : 0

        damageDetections.push({
          label: det.label,
          labelDisplay: DAMAGE_LABEL_DISPLAY[det.label] ?? det.label,
          confidence: det.confidence,
          imageIndex: img.image_index,
          bbox: {
            xMin: det.bbox.x_min,
            yMin: det.bbox.y_min,
            xMax: det.bbox.x_max,
            yMax: det.bbox.y_max,
          },
          imageWidth: imgWidth,
          imageHeight: imgHeight,
          areaRatio,
          location: deriveLocation(det.label, det.bbox, bodyEntry?.bbox),
        })
      }
    }

    // Cập nhật detectionCount per image
    for (const d of damageDetections) {
      const meta = images.find((m) => m.index === d.imageIndex)
      if (meta) meta.detectionCount += 1
    }

    // Sort detections by confidence desc cho list display
    damageDetections.sort((a, b) => b.confidence - a.confidence)

    const visibleDamages = damages.filter(
      (d) => d.part !== 'battery' && d.severity >= 0.05,
    )
    const baseSummary =
      visibleDamages.length === 0
        ? `${detectedDisplay} trong tình trạng tốt, không phát hiện hư hỏng đáng kể từ ảnh.`
        : `${detectedDisplay} có dấu hiệu hư hỏng ở: ${visibleDamages
            .map((d) => d.part)
            .join(', ')}.`

    return {
      detectedModel: detectedDisplay,
      overallCondition,
      damages,
      confidenceScore: yolo.overall_confidence || yolo.generation_confidence || 0.5,
      summary: baseSummary,
      detectedGeneration: yolo.detected_generation,
      claimedModel,
      claimedMatches: yolo.claimed_matches,
      damageDetections,
      images,
    }
  }

  private buildFallback(modelName: string, batteryHealth?: number): VisionAnalysisResult {
    return {
      detectedModel: modelName,
      overallCondition: 'GOOD',
      damages: [
        { part: 'screen', severity: 0.08, description: 'Vài vết trầy nhỏ', weight: 0.4 },
        buildBatteryDamage(batteryHealth),
        { part: 'housing', severity: 0.1, description: 'Viền máy còn tốt', weight: 0.2 },
        { part: 'camera', severity: 0.0, description: 'Camera nguyên vẹn', weight: 0.15 },
        { part: 'other', severity: 0.05, description: 'Nút bấm hoạt động tốt', weight: 0.05 },
      ],
      confidenceScore: 0.7,
      summary: `${modelName} (vision service không khả dụng, dùng giá trị mặc định).`,
      detectedGeneration: null,
      claimedModel: modelName,
      claimedMatches: true,
      damageDetections: [],
      images: [],
    }
  }
}

function buildBatteryDamage(batteryHealth?: number): DamageItem {
  // Pin 100% → severity 0
  // Pin 80% → severity 0.20 (chai vừa, Apple coi 80% là ngưỡng "service")
  // Pin 60% → severity 0.40
  // Mỗi 1% chai → +0.01 severity, capped tại 1.0
  if (typeof batteryHealth !== 'number' || !Number.isFinite(batteryHealth)) {
    return {
      part: 'battery',
      severity: 0.1,
      description: 'Pin chưa kiểm tra (cần đo độ chai thực tế)',
      weight: 0.2,
    }
  }
  const clamped = Math.max(0, Math.min(100, batteryHealth))
  const severity = Math.max(0, Math.min(1, (100 - clamped) / 100))
  let desc: string
  if (clamped >= 95) desc = `Pin còn ${clamped}% — gần như mới`
  else if (clamped >= 85) desc = `Pin còn ${clamped}% — bình thường`
  else if (clamped >= 75) desc = `Pin còn ${clamped}% — chai nhẹ`
  else if (clamped >= 60) desc = `Pin còn ${clamped}% — chai vừa, nên thay`
  else desc = `Pin còn ${clamped}% — chai nặng, cần thay sớm`
  return {
    part: 'battery',
    severity,
    description: desc,
    weight: 0.2,
  }
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

function bboxArea(b: YoloBbox): number {
  return Math.max(0, b.x_max - b.x_min) * Math.max(0, b.y_max - b.y_min)
}

function deriveLocation(
  label: string,
  bbox: YoloBbox,
  bodyBox: YoloBbox | undefined,
): 'screen' | 'housing' | 'camera' | 'other' {
  // Heuristics đơn giản. screen_defect → screen.
  // physical_damage / scratch / crack: nếu nằm trong nửa trên body → screen, không thì housing.
  if (label === 'screen_defect' || label === 'screen') return 'screen'
  if (!bodyBox) return label === 'scratch' ? 'housing' : 'screen'
  const centerY = (bbox.y_min + bbox.y_max) / 2
  const bodyTop = bodyBox.y_min
  const bodyHeight = Math.max(1, bodyBox.y_max - bodyBox.y_min)
  return centerY < bodyTop + bodyHeight * 0.55 ? 'screen' : 'housing'
}

function describeSeverity(part: string, severity: number): string {
  if (severity < 0.05) return `${part} nguyên vẹn`
  if (severity < 0.2) return `${part} có vài vết trầy nhỏ`
  if (severity < 0.5) return `${part} có hư hỏng vừa phải`
  return `${part} hư hỏng nặng`
}
