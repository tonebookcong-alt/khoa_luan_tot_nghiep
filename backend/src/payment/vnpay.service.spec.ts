import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VnpayService } from './vnpay.service';

const MOCK_CONFIG = {
  VNPAY_TMN_CODE: 'TESTCODE',
  VNPAY_HASH_SECRET: 'TESTSECRET123456',
  VNPAY_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
};

describe('VnpayService', () => {
  let service: VnpayService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        VnpayService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => MOCK_CONFIG[key as keyof typeof MOCK_CONFIG] },
        },
      ],
    }).compile();
    service = module.get(VnpayService);
  });

  describe('createPaymentUrl()', () => {
    const baseParams = {
      amount: 5_000_000,
      orderId: 'ORDER_001',
      orderInfo: 'Thanh toan test',
      returnUrl: 'http://localhost:3000/payment/ORDER_001',
      ipAddr: '127.0.0.1',
    };

    it('trả về URL bắt đầu bằng VNPAY sandbox URL', () => {
      const url = service.createPaymentUrl(baseParams);
      expect(url).toContain('sandbox.vnpayment.vn');
    });

    it('URL chứa đầy đủ các tham số bắt buộc', () => {
      const url = service.createPaymentUrl(baseParams);
      expect(url).toContain('vnp_TmnCode=TESTCODE');
      expect(url).toContain('vnp_TxnRef=ORDER_001');
      expect(url).toContain('vnp_Amount=500000000'); // 5_000_000 × 100
      expect(url).toContain('vnp_SecureHash=');
      expect(url).toContain('vnp_ReturnUrl=');
    });

    it('amount được nhân 100 theo quy định VNPAY', () => {
      const url = service.createPaymentUrl({ ...baseParams, amount: 1_000_000 });
      expect(url).toContain('vnp_Amount=100000000'); // 1_000_000 × 100
    });

    it('tạo URL khác nhau cho 2 orderId khác nhau', () => {
      const url1 = service.createPaymentUrl({ ...baseParams, orderId: 'ORDER_001' });
      const url2 = service.createPaymentUrl({ ...baseParams, orderId: 'ORDER_002' });
      expect(url1).not.toBe(url2);
    });

    it('URL chứa vnp_Locale=vn và vnp_CurrCode=VND', () => {
      const url = service.createPaymentUrl(baseParams);
      expect(url).toContain('vnp_Locale=vn');
      expect(url).toContain('vnp_CurrCode=VND');
    });
  });

  describe('verifySignature()', () => {
    it('trả về false khi không có vnp_SecureHash', () => {
      const result = service.verifySignature({ vnp_ResponseCode: '00' });
      expect(result).toBe(false);
    });

    it('trả về false khi chữ ký sai', () => {
      const result = service.verifySignature({
        vnp_TxnRef: 'ORDER_001',
        vnp_ResponseCode: '00',
        vnp_SecureHash: 'wrong_hash_value',
      });
      expect(result).toBe(false);
    });

    it('trả về true khi chữ ký đúng (self-signed)', () => {
      // Tạo URL rồi parse lại params để verify
      const url = service.createPaymentUrl({
        amount: 1_000_000,
        orderId: 'TEST_VERIFY',
        orderInfo: 'Test verify',
        returnUrl: 'http://localhost:3000/return',
        ipAddr: '192.168.1.1',
      });

      const urlObj = new URL(url);
      const params: Record<string, string> = {};
      urlObj.searchParams.forEach((v, k) => { params[k] = v; });

      const result = service.verifySignature(params);
      expect(result).toBe(true);
    });

    it('trả về false khi params bị thay đổi sau khi ký', () => {
      const url = service.createPaymentUrl({
        amount: 1_000_000,
        orderId: 'TEST_TAMPER',
        orderInfo: 'Test tamper',
        returnUrl: 'http://localhost:3000/return',
        ipAddr: '127.0.0.1',
      });

      const urlObj = new URL(url);
      const params: Record<string, string> = {};
      urlObj.searchParams.forEach((v, k) => { params[k] = v; });

      // Thay đổi amount sau khi ký → signature phải fail
      params['vnp_Amount'] = '999999999';
      const result = service.verifySignature(params);
      expect(result).toBe(false);
    });
  });
});
