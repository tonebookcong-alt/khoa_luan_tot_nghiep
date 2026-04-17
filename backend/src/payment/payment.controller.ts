import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { TransactionsService } from './transactions.service';
import { VnpayService } from './vnpay.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('Payment')
@Controller()
export class PaymentController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly vnpayService: VnpayService,
    private readonly config: ConfigService,
  ) {}

  // ── Transactions ──

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('transactions')
  @ApiOperation({ summary: 'Tạo giao dịch mua và nhận link thanh toán VNPAY' })
  async createTransaction(
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const transaction = await this.transactionsService.create(dto.listingId, user.sub);

    const ipAddr =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ??
      req.socket.remoteAddress ??
      '127.0.0.1';

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const returnUrl = `${frontendUrl}/payment/${transaction.id}`;

    const paymentUrl = this.vnpayService.createPaymentUrl({
      amount: transaction.amount,
      orderId: transaction.id,
      orderInfo: `Thanh toan tin dang ${dto.listingId}`,
      returnUrl,
      ipAddr,
    });

    return { transaction, paymentUrl };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  @ApiOperation({ summary: 'Lấy danh sách giao dịch của user' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.transactionsService.findAllForUser(user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('transactions/:id')
  @ApiOperation({ summary: 'Chi tiết giao dịch' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.transactionsService.findOne(id, user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('transactions/:id/confirm')
  @ApiOperation({ summary: 'Buyer/Seller xác nhận hoàn thành giao dịch' })
  confirm(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.transactionsService.confirm(id, user.sub);
  }

  // ── VNPAY callbacks ──

  @Get('payment/return')
  @ApiOperation({ summary: 'VNPAY redirect sau khi thanh toán (GET)' })
  async handleReturn(@Query() query: Record<string, string>) {
    const isValid = this.vnpayService.verifySignature(query);
    const responseCode = query['vnp_ResponseCode'];
    const transactionId = query['vnp_TxnRef'];

    if (isValid && responseCode === '00') {
      return { success: true, transactionId, message: 'Thanh toán thành công' };
    }
    return { success: false, transactionId, message: 'Thanh toán thất bại hoặc bị hủy' };
  }

  @Post('payment/ipn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'VNPAY IPN webhook (server-to-server)' })
  async handleIpn(@Query() query: Record<string, string>) {
    const isValid = this.vnpayService.verifySignature(query);

    if (!isValid) {
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const responseCode = query['vnp_ResponseCode'];
    const transactionId = query['vnp_TxnRef'];
    const vnpayRef = query['vnp_TransactionNo'] ?? '';

    if (responseCode === '00') {
      await this.transactionsService.markEscrowed(transactionId, vnpayRef, query);
      return { RspCode: '00', Message: 'Confirm Success' };
    }

    return { RspCode: '00', Message: 'Payment failed, no action' };
  }
}
