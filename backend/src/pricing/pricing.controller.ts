import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Logger,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname } from 'path'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { VisionService } from './vision.service'
import { MarketService } from './market.service'
import { PricingCalculatorService } from './pricing-calculator.service'
import { EstimateRequestDto } from './dto/estimate.dto'
import { PrismaService } from '../prisma/prisma.service'

const multerStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const uniqueSuffix = `ai-${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`)
  },
})

@ApiTags('pricing')
@Controller('pricing')
export class PricingController {
  private readonly logger = new Logger(PricingController.name)

  constructor(
    private visionService: VisionService,
    private marketService: MarketService,
    private calculatorService: PricingCalculatorService,
    private prisma: PrismaService,
  ) {}

  @Post('estimate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Định giá AI: phân tích ảnh + giá thị trường → P_final' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10, { storage: multerStorage }))
  async estimate(
    @Body() dto: EstimateRequestDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const safeFiles = files ?? []
    const batteryHealth = dto.batteryHealth
    this.logger.log(
      `estimate called: brand=${dto.brand} model=${dto.model} files=${safeFiles.length} battery=${batteryHealth ?? 'n/a'}`,
    )
    // Chạy song song: phân tích ảnh + lấy giá thị trường
    const [visionResult, marketResult] = await Promise.all([
      this.visionService.analyzeImages(safeFiles, dto.model, dto.brand, dto.listingId, batteryHealth),
      this.marketService.getMarketPrice(dto.brand, dto.model),
    ])

    const result = this.calculatorService.calculate(
      marketResult.pMarket,
      visionResult.damages,
      visionResult.confidenceScore,
      marketResult.priceRange,
      visionResult.detectedModel,
      visionResult.overallCondition,
      visionResult.summary,
      marketResult.marketSummary,
      marketResult.dataPoints,
      {
        detectedGeneration: visionResult.detectedGeneration,
        claimedModel: visionResult.claimedModel,
        claimedMatches: visionResult.claimedMatches,
        damageDetections: visionResult.damageDetections,
        images: visionResult.images,
        marketSamples: marketResult.marketSamples,
        dataSource: marketResult.dataSource,
      },
    )

    // Nếu có listingId, lưu aiPriceResult vào listing (non-blocking)
    if (dto.listingId) {
      void this.prisma.listing
        .update({
          where: { id: dto.listingId },
          data: { aiPriceResult: result as object },
        })
        .catch(() => { /* listing có thể chưa tồn tại */ })
    }

    return result
  }
}
