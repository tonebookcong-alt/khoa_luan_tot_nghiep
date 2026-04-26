import { GoogleGenerativeAI } from '@google/generative-ai'
import { AiAnalysisLogModel } from '../shared/schemas/ai-analysis-log.schema'

export interface DamageItem {
  part: 'screen' | 'battery' | 'housing' | 'camera' | 'other'
  severity: number       // 0.0 → 1.0
  description: string
  weight: number
}

export interface GeminiAnalysisResult {
  detectedModel: string
  overallCondition: string
  damages: DamageItem[]
  confidenceScore: number
  summary: string
  imageType: 'real_device' | 'marketing' | 'unclear'
}

// Trọng số hư hỏng theo CLAUDE.md
const DAMAGE_WEIGHTS: Record<string, number> = {
  screen: 0.40,
  battery: 0.20,
  housing: 0.20,
  camera: 0.15,
  other: 0.05,
}

const ANALYSIS_PROMPT = (modelName: string) => `
Bạn là chuyên gia đánh giá tình trạng điện thoại cũ tại thị trường Việt Nam.
Thiết bị cần phân tích: "${modelName}"

BƯỚC 1 — PHÂN LOẠI ẢNH (BẮT BUỘC, làm trước mọi thứ khác):
Xác định loại ảnh:
- "real_device": Ảnh chụp trực tiếp thiết bị thực tế (thấy bàn tay, bàn gỗ, ánh đèn thực, nền không hoàn hảo, góc chụp tự nhiên)
- "marketing": Ảnh quảng cáo/catalog (nền trắng/đen hoàn toàn đồng đều, ánh sáng studio hoàn hảo, render 3D, ảnh lấy từ website hãng, không có dấu hiệu sử dụng thực tế)
- "unclear": Ảnh quá mờ, quá tối, hoặc không thể xác định

QUY TẮC CỨNG — KHÔNG ĐƯỢC VI PHẠM:
- Nếu imageType = "marketing": đặt TẤT CẢ severity = 0.00, overallCondition = "LIKE_NEW", confidenceScore = 0.15
- Nếu imageType = "unclear": đặt TẤT CẢ severity = 0.00, overallCondition = "GOOD", confidenceScore = 0.10
- Chỉ chấm điểm hư hỏng thực sự khi imageType = "real_device"

BƯỚC 2 — CHỈ khi imageType = "real_device": Đánh giá từng hạng mục bằng cách quan sát trực tiếp các vết trầy, nứt, bong tróc thực sự nhìn thấy trong ảnh.

Trả về JSON hợp lệ, KHÔNG thêm bất kỳ text nào ngoài JSON:
{
  "imageType": "real_device hoặc marketing hoặc unclear",
  "detectedModel": "Tên model nhận diện được",
  "overallCondition": "LIKE_NEW hoặc GOOD hoặc FAIR hoặc POOR",
  "damages": {
    "screen": { "severity": 0.0, "description": "Mô tả tiếng Việt" },
    "battery": { "severity": 0.0, "description": "Ước tính từ tình trạng tổng thể" },
    "housing": { "severity": 0.0, "description": "Vỏ máy, viền, mặt lưng" },
    "camera": { "severity": 0.0, "description": "Cụm camera" },
    "other": { "severity": 0.0, "description": "Nút bấm, cổng sạc, loa" }
  },
  "confidenceScore": 0.85,
  "summary": "1-2 câu tóm tắt tiếng Việt. Nếu là ảnh quảng cáo, ghi rõ: 'Đây là ảnh quảng cáo — vui lòng tải ảnh thực tế để định giá chính xác.'"
}

Quy tắc severity CHỈ áp dụng cho real_device (0.0 = nguyên vẹn, 1.0 = hỏng hoàn toàn):
- 0.00 - 0.05: Không có hư hỏng
- 0.06 - 0.20: Trầy xước nhỏ, khó thấy
- 0.21 - 0.40: Hư hỏng nhẹ, dễ thấy
- 0.41 - 0.60: Hư hỏng trung bình, ảnh hưởng thẩm mỹ
- 0.61 - 0.80: Hư hỏng nặng, có thể ảnh hưởng chức năng
- 0.81 - 1.00: Hỏng hoàn toàn
`

type SupportedMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

const SUPPORTED_MIMES: SupportedMime[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function toSupportedMime(raw: string): SupportedMime {
  return SUPPORTED_MIMES.includes(raw as SupportedMime) ? (raw as SupportedMime) : 'image/jpeg'
}

export async function analyzeDevice(
  modelName: string,
  brand: string,
  imageBase64s: string[],
  listingId?: string,
  imageMimeTypes?: string[],
): Promise<GeminiAnalysisResult> {
  const apiKey = process.env['GEMINI_API_KEY']

  // Fallback mock nếu không có API key (để dev/test)
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set — returning mock analysis')
    return buildMockAnalysis(modelName)
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  })

  // Build image parts từ base64, dùng đúng MIME type của từng file
  const imageParts = imageBase64s.map((base64, i) => ({
    inlineData: {
      data: base64,
      mimeType: toSupportedMime(imageMimeTypes?.[i] ?? 'image/jpeg'),
    },
  }))

  let rawJson = ''
  try {
    const result = await model.generateContent([
      ANALYSIS_PROMPT(modelName),
      ...imageParts,
    ])
    rawJson = result.response.text()
    const parsed = JSON.parse(rawJson)
    const analysisResult = mapToAnalysisResult(parsed, modelName)

    // Lưu log vào MongoDB (non-blocking)
    void saveAnalysisLog({
      listingId: listingId ?? 'unknown',
      imageCount: imageBase64s.length,
      detectedModel: analysisResult.detectedModel,
      damages: analysisResult.damages,
      confidenceScore: analysisResult.confidenceScore,
      geminiRawResponse: rawJson,
    })

    return analysisResult
  } catch (err) {
    console.error('Gemini Vision error:', err)
    // Fallback mock nếu API lỗi
    return buildMockAnalysis(modelName)
  }
}

function mapToAnalysisResult(parsed: Record<string, unknown>, fallbackModel: string): GeminiAnalysisResult {
  const imageType = (parsed['imageType'] as string | undefined) ?? 'unclear'
  const isNonReal = imageType === 'marketing' || imageType === 'unclear'

  const rawDamages = parsed['damages'] as Record<string, { severity: number; description: string }> | undefined

  const damages: DamageItem[] = (['screen', 'battery', 'housing', 'camera', 'other'] as const).map((part) => ({
    part,
    // Ép severity = 0 nếu ảnh quảng cáo, bất kể Gemini trả về gì
    severity: isNonReal ? 0 : clamp(rawDamages?.[part]?.severity ?? 0, 0, 1),
    description: isNonReal
      ? (part === 'screen' ? 'Ảnh quảng cáo — không thể đánh giá' : '')
      : (rawDamages?.[part]?.description ?? ''),
    weight: DAMAGE_WEIGHTS[part] ?? 0.05,
  }))

  return {
    imageType: imageType as GeminiAnalysisResult['imageType'],
    detectedModel: (parsed['detectedModel'] as string | undefined) ?? fallbackModel,
    overallCondition: isNonReal ? 'LIKE_NEW' : ((parsed['overallCondition'] as string | undefined) ?? 'GOOD'),
    damages,
    confidenceScore: isNonReal ? 0.15 : clamp((parsed['confidenceScore'] as number | undefined) ?? 0.7, 0, 1),
    summary: (parsed['summary'] as string | undefined) ?? '',
  }
}

function buildMockAnalysis(modelName: string): GeminiAnalysisResult {
  return {
    imageType: 'real_device',
    detectedModel: modelName,
    overallCondition: 'GOOD',
    damages: [
      { part: 'screen', severity: 0.08, description: 'Vài vết trầy nhỏ ở góc màn hình, không ảnh hưởng hiển thị', weight: 0.40 },
      { part: 'battery', severity: 0.15, description: 'Tình trạng pin ước tính còn khoảng 85-90% dung lượng', weight: 0.20 },
      { part: 'housing', severity: 0.12, description: 'Viền máy có 2-3 điểm xước nhỏ, mặt lưng nguyên vẹn', weight: 0.20 },
      { part: 'camera', severity: 0.00, description: 'Cụm camera hoàn toàn nguyên vẹn, không có vết nứt hay trầy', weight: 0.15 },
      { part: 'other', severity: 0.05, description: 'Nút bấm và cổng sạc hoạt động tốt', weight: 0.05 },
    ],
    confidenceScore: 0.75,
    summary: `${modelName} ở tình trạng tốt, sử dụng cẩn thận. Có một số vết trầy nhỏ trên viền và màn hình nhưng không đáng kể.`,
  }
}

async function saveAnalysisLog(data: {
  listingId: string
  imageCount: number
  detectedModel: string
  damages: DamageItem[]
  confidenceScore: number
  geminiRawResponse: string
}): Promise<void> {
  try {
    await AiAnalysisLogModel.create({
      listingId: data.listingId,
      imageUrls: [],
      detectedModel: data.detectedModel,
      damageItems: data.damages.map((d) => ({
        part: d.part,
        severity: d.severity,
        description: d.description,
        weight: d.weight,
      })),
      confidenceScore: data.confidenceScore,
      pFinal: 0, // sẽ update sau khi tính
      pMarket: 0,
      geminiRawResponse: data.geminiRawResponse,
    })
  } catch (err) {
    console.warn('Failed to save analysis log:', err)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
