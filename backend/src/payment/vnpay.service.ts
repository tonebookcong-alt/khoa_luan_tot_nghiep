import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface VnpayParams {
  amount: number; // VND
  orderId: string;
  orderInfo: string;
  returnUrl: string;
  ipAddr: string;
}

@Injectable()
export class VnpayService {
  private readonly tmnCode: string;
  private readonly hashSecret: string;
  private readonly vnpUrl: string;

  constructor(private config: ConfigService) {
    this.tmnCode = this.config.get<string>('VNPAY_TMN_CODE') ?? 'TESTCODE';
    this.hashSecret = this.config.get<string>('VNPAY_HASH_SECRET') ?? 'TESTSECRET';
    this.vnpUrl =
      this.config.get<string>('VNPAY_URL') ??
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  }

  createPaymentUrl(params: VnpayParams): string {
    const date = new Date();
    const createDate = this.formatDate(date);
    const expireDate = this.formatDate(new Date(date.getTime() + 15 * 60 * 1000));

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Amount: String(params.amount * 100), // VNPAY dùng đơn vị * 100
      vnp_CreateDate: createDate,
      vnp_CurrCode: 'VND',
      vnp_IpAddr: params.ipAddr,
      vnp_Locale: 'vn',
      vnp_OrderInfo: params.orderInfo,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: params.returnUrl,
      vnp_TxnRef: params.orderId,
      vnp_ExpireDate: expireDate,
    };

    const sorted = this.sortObject(vnpParams);
    const signData = new URLSearchParams(sorted).toString();
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return `${this.vnpUrl}?${signData}&vnp_SecureHash=${signed}`;
  }

  verifySignature(params: Record<string, string>): boolean {
    const secureHash = params['vnp_SecureHash'];
    if (!secureHash) return false;

    const cloned = { ...params };
    delete cloned['vnp_SecureHash'];
    delete cloned['vnp_SecureHashType'];

    const sorted = this.sortObject(cloned);
    const signData = new URLSearchParams(sorted).toString();
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return signed === secureHash;
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      date.getFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }

  private sortObject(obj: Record<string, string>): Record<string, string> {
    return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
  }
}