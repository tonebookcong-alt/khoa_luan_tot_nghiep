import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { User } from '@prisma/client';

type UserWithoutPassword = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<UserWithoutPassword> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserWithoutPassword> {
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
    });
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  // Admin operations
  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isBanned: true,
          createdAt: true,
          updatedAt: true,
          googleId: true,
          address: true,
          avatar: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);
    return { data: users, total, page, limit };
  }

  async adminUpdate(id: string, dto: AdminUpdateUserDto): Promise<UserWithoutPassword> {
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
    });
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new BadRequestException('Không thể tự chặn mình');
    const target = await this.prisma.user.findUnique({ where: { id: blockedId }, select: { id: true } });
    if (!target) throw new NotFoundException('Người dùng không tồn tại');
    await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
    return { blocked: true };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } });
    return { blocked: false };
  }

  async getBlockStatus(viewerId: string, otherUserId: string): Promise<'none' | 'i_blocked' | 'i_am_blocked'> {
    const [iBlocked, iAmBlocked] = await Promise.all([
      this.prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: viewerId, blockedId: otherUserId } } }),
      this.prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: otherUserId, blockedId: viewerId } } }),
    ]);
    if (iBlocked) return 'i_blocked';
    if (iAmBlocked) return 'i_am_blocked';
    return 'none';
  }

  async isBlockedBetween(userA: string, userB: string): Promise<boolean> {
    const count = await this.prisma.block.count({
      where: { OR: [{ blockerId: userA, blockedId: userB }, { blockerId: userB, blockedId: userA }] },
    });
    return count > 0;
  }
}
