import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionStatus } from '@prisma/client';

const COMMISSION_RATE = 0.03; // 3% phí hoa hồng

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(listingId: string, buyerId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true, askingPrice: true, status: true, title: true },
    });
    if (!listing) throw new NotFoundException('Tin đăng không tồn tại');
    if (listing.sellerId === buyerId)
      throw new BadRequestException('Không thể tự mua tin của mình');
    if (listing.status !== 'ACTIVE')
      throw new BadRequestException('Tin đăng không còn hoạt động');

    const amount = listing.askingPrice;
    const commission = Math.round(amount * COMMISSION_RATE);

    return this.prisma.transaction.create({
      data: {
        listingId,
        buyerId,
        sellerId: listing.sellerId,
        amount,
        commission,
        status: TransactionStatus.PENDING,
      },
      select: {
        id: true,
        amount: true,
        commission: true,
        status: true,
        listing: { select: { id: true, title: true, askingPrice: true } },
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        createdAt: true,
      },
    });
  }

  async findOne(id: string, userId: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      select: {
        id: true,
        amount: true,
        commission: true,
        status: true,
        vnpayRef: true,
        confirmedByBuyer: true,
        confirmedBySeller: true,
        createdAt: true,
        updatedAt: true,
        listing: {
          select: {
            id: true,
            title: true,
            askingPrice: true,
            images: { select: { url: true }, take: 1 },
          },
        },
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
    });
    if (!tx) throw new NotFoundException('Giao dịch không tồn tại');
    if (tx.buyer.id !== userId && tx.seller.id !== userId)
      throw new ForbiddenException();
    return tx;
  }

  async findAllForUser(userId: string) {
    return this.prisma.transaction.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        commission: true,
        status: true,
        createdAt: true,
        listing: {
          select: {
            id: true,
            title: true,
            images: { select: { url: true }, take: 1 },
          },
        },
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
    });
  }

  async markEscrowed(
    transactionId: string,
    vnpayRef: string,
    vnpayData: Record<string, string>,
  ) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { id: true, status: true },
    });
    if (!tx || tx.status !== TransactionStatus.PENDING) return;

    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.ESCROWED, vnpayRef, vnpayData },
    });
  }

  async confirm(transactionId: string, userId: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        status: true,
        listingId: true,
        buyerId: true,
        sellerId: true,
        confirmedByBuyer: true,
        confirmedBySeller: true,
      },
    });
    if (!tx) throw new NotFoundException('Giao dịch không tồn tại');
    if (tx.buyerId !== userId && tx.sellerId !== userId) throw new ForbiddenException();
    if (tx.status !== TransactionStatus.ESCROWED)
      throw new BadRequestException('Giao dịch chưa ở trạng thái ESCROWED');

    const isBuyer = tx.buyerId === userId;
    const updated = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: isBuyer ? { confirmedByBuyer: true } : { confirmedBySeller: true },
      select: { confirmedByBuyer: true, confirmedBySeller: true },
    });

    if (updated.confirmedByBuyer && updated.confirmedBySeller) {
      await this.prisma.$transaction([
        this.prisma.transaction.update({
          where: { id: transactionId },
          data: { status: TransactionStatus.COMPLETED },
        }),
        this.prisma.listing.update({
          where: { id: tx.listingId },
          data: { status: 'SOLD' },
        }),
      ]);
    }

    return this.prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { id: true, status: true, confirmedByBuyer: true, confirmedBySeller: true },
    });
  }
}
