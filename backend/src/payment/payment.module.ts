import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionsService } from './transactions.service';
import { VnpayService } from './vnpay.service';
import { PaymentController } from './payment.controller';

@Module({
  imports: [PrismaModule],
  providers: [TransactionsService, VnpayService],
  controllers: [PaymentController],
  exports: [TransactionsService],
})
export class PaymentModule {}
