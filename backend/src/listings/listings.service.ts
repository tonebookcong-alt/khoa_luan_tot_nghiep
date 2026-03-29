import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { QueryListingDto } from './dto/query-listing.dto';
import { ListingStatus, Prisma, Role } from '@prisma/client';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async create(sellerId: string, dto: CreateListingDto, files: Express.Multer.File[]) {
    const listing = await this.prisma.listing.create({
      data: {
        sellerId,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        condition: dto.condition,
        askingPrice: dto.askingPrice,
        brand: dto.brand,
        model: dto.model,
        storage: dto.storage,
        color: dto.color,
        images: {
          create: files.map((file, index) => ({
            url: `/uploads/${file.filename}`,
            order: index,
          })),
        },
      },
      include: { images: true, category: true, seller: { select: { id: true, name: true, avatar: true } } },
    });
    return listing;
  }

  async findAll(query: QueryListingDto, role?: Role) {
    const {
      search,
      categoryId,
      brand,
      condition,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 12,
      status,
    } = query;

    const where: Prisma.ListingWhereInput = {
      // Non-admin users only see ACTIVE listings
      status: role === Role.ADMIN && status ? status : ListingStatus.ACTIVE,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(brand && { brand: { equals: brand, mode: 'insensitive' } }),
      ...(condition && { condition }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        askingPrice: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      }),
    };

    const orderBy: Prisma.ListingOrderByWithRelationInput =
      sort === 'price_asc'
        ? { askingPrice: 'asc' }
        : sort === 'price_desc'
          ? { askingPrice: 'desc' }
          : { createdAt: 'desc' };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          category: true,
          seller: { select: { id: true, name: true, avatar: true } },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: 'asc' } },
        category: true,
        seller: { select: { id: true, name: true, avatar: true, phone: true, createdAt: true } },
      },
    });
    if (!listing) throw new NotFoundException('Tin đăng không tồn tại');
    return listing;
  }

  async findBySeller(sellerId: string) {
    return this.prisma.listing.findMany({
      where: { sellerId },
      include: { images: { orderBy: { order: 'asc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async publish(id: string, sellerId: string, role: Role) {
    const listing = await this.findOne(id);
    if (listing.sellerId !== sellerId && role !== Role.ADMIN) {
      throw new ForbiddenException();
    }
    if (listing.status !== ListingStatus.DRAFT) {
      throw new ForbiddenException('Chỉ có thể publish tin ở trạng thái DRAFT');
    }
    return this.prisma.listing.update({
      where: { id },
      data: { status: ListingStatus.ACTIVE },
    });
  }

  async update(id: string, sellerId: string, role: Role, dto: UpdateListingDto) {
    const listing = await this.findOne(id);
    if (listing.sellerId !== sellerId && role !== Role.ADMIN) {
      throw new ForbiddenException();
    }
    return this.prisma.listing.update({
      where: { id },
      data: dto,
      include: { images: true },
    });
  }

  async remove(id: string, sellerId: string, role: Role) {
    const listing = await this.findOne(id);
    if (listing.sellerId !== sellerId && role !== Role.ADMIN) {
      throw new ForbiddenException();
    }
    return this.prisma.listing.update({
      where: { id },
      data: { status: ListingStatus.REMOVED },
    });
  }
}
