import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const MSG_SELECT = {
  id: true,
  content: true,
  mediaUrl: true,
  senderId: true,
  isRead: true,
  createdAt: true,
  sender: { select: { id: true, name: true, avatar: true } },
} as const;

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService, private usersService: UsersService) {}

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
      select: {
        id: true,
        listingId: true,
        createdAt: true,
        updatedAt: true,
        listing: {
          select: {
            id: true,
            title: true,
            askingPrice: true,
            images: { select: { url: true }, orderBy: { order: 'asc' }, take: 1 },
          },
        },
        buyer: { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true, avatar: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, mediaUrl: true, createdAt: true, senderId: true },
        },
        _count: {
          select: {
            messages: { where: { isRead: false, senderId: { not: userId } } },
          },
        },
      },
    });

    const blockStatuses = await Promise.all(
      convs.map((c) => {
        const otherId = c.buyer.id === userId ? c.seller.id : c.buyer.id;
        return this.usersService.getBlockStatus(userId, otherId);
      }),
    );

    return convs.map((c, i) => ({
      id: c.id,
      listing: c.listing,
      buyer: c.buyer,
      seller: c.seller,
      lastMessage: c.messages[0] ?? null,
      unreadCount: c._count.messages,
      blockStatus: blockStatuses[i],
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async findOne(id: string, userId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
      select: {
        id: true,
        listing: { select: { id: true, title: true, askingPrice: true, images: { select: { url: true }, take: 1 } } },
        buyer: { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true, avatar: true } },
      },
    });
    if (!conv) throw new NotFoundException('Cuộc trò chuyện không tồn tại');
    if (conv.buyer.id !== userId && conv.seller.id !== userId)
      throw new ForbiddenException();
    return conv;
  }

  async getMessages(conversationId: string, userId: string) {
    await this.findOne(conversationId, userId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: MSG_SELECT,
    });

    // Mark unread messages as read
    await this.prisma.message.updateMany({
      where: { conversationId, isRead: false, senderId: { not: userId } },
      data: { isRead: true },
    });

    return messages;
  }

  async createMessage(conversationId: string, senderId: string, content: string, mediaUrl?: string) {
    const conv = await this.findOne(conversationId, senderId);
    const receiverId = conv.buyer.id === senderId ? conv.seller.id : conv.buyer.id;
    const isBlocked = await this.usersService.isBlockedBetween(senderId, receiverId);
    if (isBlocked) throw new ForbiddenException('Không thể nhắn tin do bị chặn');

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        ...(mediaUrl && { mediaUrl }),
      },
      select: MSG_SELECT,
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }
}
