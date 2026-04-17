import { Test } from '@nestjs/testing';
import { PricingCalculatorService } from './pricing-calculator.service';
import { DamageItem } from './vision.service';

describe('PricingCalculatorService', () => {
  let service: PricingCalculatorService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PricingCalculatorService],
    }).compile();
    service = module.get(PricingCalculatorService);
  });

  const baseArgs = {
    confidenceScore: 0.8,
    priceRange: { low: 8_000_000, high: 12_000_000 },
    detectedModel: 'iPhone 14',
    overallCondition: 'good',
    summary: 'Device in good condition',
    marketSummary: 'Market price stable',
    dataPoints: 10,
  };

  describe('calculate()', () => {
    it('trả về pFinal = pMarket khi không có hư hỏng nào', () => {
      const result = service.calculate(10_000_000, [], ...Object.values(baseArgs) as [number, { low: number; high: number }, string, string, string, string, number]);
      // multiplier = 1 → pFinal = round(pMarket / 100_000) * 100_000
      expect(result.pFinal).toBe(10_000_000);
      expect(result.pMarket).toBe(10_000_000);
    });

    it('pFinal thấp hơn pMarket khi có hư hỏng', () => {
      const damages: DamageItem[] = [
        { part: 'screen', severity: 0.5, description: 'Vết trầy nhẹ', weight: 0.4 },
      ];
      const result = service.calculate(10_000_000, damages, ...Object.values(baseArgs) as [number, { low: number; high: number }, string, string, string, string, number]);
      // P_final = 10_000_000 × (1 - 0.4 × 0.5) = 10_000_000 × 0.8 = 8_000_000
      expect(result.pFinal).toBe(8_000_000);
      expect(result.pFinal).toBeLessThan(result.pMarket);
    });

    it('pFinal = 0 khi pMarket = 0', () => {
      const result = service.calculate(0, [], ...Object.values(baseArgs) as [number, { low: number; high: number }, string, string, string, string, number]);
      expect(result.pFinal).toBe(0);
    });

    it('damageBreakdown chứa đúng số item với deductionPercent hợp lệ', () => {
      const damages: DamageItem[] = [
        { part: 'screen', severity: 0.3, description: 'Vết nứt nhỏ', weight: 0.4 },
        { part: 'battery', severity: 0.5, description: 'Chai pin', weight: 0.2 },
      ];
      const result = service.calculate(10_000_000, damages, ...Object.values(baseArgs) as [number, { low: number; high: number }, string, string, string, string, number]);
      expect(result.damageBreakdown).toHaveLength(2);
      // deductionPercent = round(0.4 × 0.3 × 100 × 10) / 10 = 12
      expect(result.damageBreakdown[0].deductionPercent).toBe(12);
      // deductionPercent = round(0.2 × 0.5 × 100 × 10) / 10 = 10
      expect(result.damageBreakdown[1].deductionPercent).toBe(10);
    });

    it('priceRange.low ≤ pFinal ≤ priceRange.high khi pFinal > 0', () => {
      const damages: DamageItem[] = [
        { part: 'camera', severity: 0.2, description: 'Camera mờ nhẹ', weight: 0.15 },
      ];
      const result = service.calculate(10_000_000, damages, ...Object.values(baseArgs) as [number, { low: number; high: number }, string, string, string, string, number]);
      expect(result.priceRange.low).toBeLessThanOrEqual(result.pFinal);
      expect(result.priceRange.high).toBeGreaterThanOrEqual(result.pFinal);
    });

    it('confidence thấp hơn → khoảng priceRange rộng hơn', () => {
      const damages: DamageItem[] = [];
      const pMarket = 10_000_000;

      const highConf = service.calculate(pMarket, damages, 0.95, baseArgs.priceRange, ...Object.values({ ...baseArgs, confidenceScore: 0.95 }).slice(2) as [string, string, string, string, number]);
      const lowConf = service.calculate(pMarket, damages, 0.3, baseArgs.priceRange, ...Object.values({ ...baseArgs, confidenceScore: 0.3 }).slice(2) as [string, string, string, string, number]);

      const highSpread = highConf.priceRange.high - highConf.priceRange.low;
      const lowSpread = lowConf.priceRange.high - lowConf.priceRange.low;
      expect(lowSpread).toBeGreaterThan(highSpread);
    });

    it('pFinal được làm tròn xuống bội số 100.000', () => {
      // 9_800_000 * 0.8 = 7_840_000 → round(7840000 / 100000) * 100000 = 7_800_000
      const damages: DamageItem[] = [
        { part: 'screen', severity: 0.5, description: '', weight: 0.4 },
      ];
      const result = service.calculate(9_800_000, damages, ...Object.values(baseArgs) as [number, { low: number; high: number }, string, string, string, string, number]);
      expect(result.pFinal % 100_000).toBe(0);
    });

    it('nhiều hư hỏng áp dụng công thức nhân liên tiếp', () => {
      const damages: DamageItem[] = [
        { part: 'screen', severity: 0.5, description: '', weight: 0.4 },
        { part: 'battery', severity: 1.0, description: '', weight: 0.2 },
      ];
      const result = service.calculate(10_000_000, damages, ...Object.values(baseArgs) as [number, { low: number; high: number }, string, string, string, string, number]);
      // P_final = 10M × (1 - 0.4×0.5) × (1 - 0.2×1.0) = 10M × 0.8 × 0.8 = 6.4M → 6.4M
      expect(result.pFinal).toBe(6_400_000);
    });
  });
});
