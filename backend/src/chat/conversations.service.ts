import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CONVERSATION_SELECT = {
  id: true,
  listingId: true,
  createdAt: true,
  updatedAt: true,
  listing: {
    select: {
      id: true,
      title: true,
      images: { select: { url: true }, take: 1 },
    },
  },
  buyer: { select: { id: true, name: true, avatar: true } },
  seller: { select: { id: true, name: true, avatar: true } },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { content: true, createdAt: true },
  },
};

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async create(listingId: string, buyerId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true, status: true },
    });
    if (!listing) throw new NotFoundException('Tin đăng không tồn tại');
    if (listing.sellerId === buyerId)
      throw new BadRequestException('Không thể tự liên hệ với chính mình');

    const existing = await this.prisma.conversation.findUnique({
      where: { listingId_buyerId: { listingId, buyerId } },
    });
    if (existing) {
      throw new ConflictException({ conversationId: existing.id });
    }

    return this.prisma.conversation.create({
      data: { listingId, buyerId, sellerId: listing.sellerId },
      select: { id: true },
    });
  }

  async findAllForUser(userId: string) {
    const convs = await this.prisma.conversation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: { updatedAt: 'desc' },
      select: CONVERSATION_SELECT,
    });

    return convs.map((c) => ({
      ...c,
      lastMessage: c.messages[0] ?? null,
      messages: undefined,
    }));
  }

  async findOne(id: string, userId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
      select: CONVERSATION_SELECT,
    });
    if (!conv) throw new NotFoundException('Cuộc trò chuyện không tồn tại');
    if (conv.buyer.id !== userId && conv.seller.id !== userId)
      throw new ForbiddenException();
    return conv;
  }

  async getMessages(conversationId: string, userId: string) {
    await this.findOne(conversationId, userId); // auth check

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        senderId: true,
        isRead: true,
        createdAt: true,
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Mark unread messages as read
    await this.prisma.message.updateMany({
      where: { conversationId, isRead: false, senderId: { not: userId } },
      data: { isRead: true },
    });

    return messages;
  }

  async createMessage(conversationId: string, senderId: string, content: string) {
    await this.findOne(conversationId, senderId); // auth check

    const message = await this.prisma.message.create({
      data: { conversationId, senderId, content },
      select: {
        id: true,
        content: true,
        senderId: true,
        isRead: true,
        createdAt: true,
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Update conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }
}