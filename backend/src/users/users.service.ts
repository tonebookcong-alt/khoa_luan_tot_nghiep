import { Injectable, NotFoundException } from '@nestjs/common';
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
}
