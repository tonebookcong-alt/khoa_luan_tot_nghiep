import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: { children: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllForAdmin(search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const categories = await this.prisma.category.findMany({
      where,
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { children: true, listings: true } },
      },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: c.imageUrl,
      parentId: c.parentId,
      parentName: c.parent?.name ?? null,
      childrenCount: c._count.children,
      listingCount: c._count.listings,
      createdAt: c.createdAt,
    }));
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });
    if (!category) throw new NotFoundException('Danh mục không tồn tại');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const exists = await this.prisma.category.findUnique({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('Slug đã tồn tại');

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new BadRequestException('Danh mục cha không tồn tại');
      if (parent.parentId) {
        throw new BadRequestException('Chỉ hỗ trợ tối đa 2 cấp danh mục');
      }
    }

    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const current = await this.prisma.category.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Danh mục không tồn tại');

    if (dto.slug && dto.slug !== current.slug) {
      const dup = await this.prisma.category.findUnique({ where: { slug: dto.slug } });
      if (dup) throw new ConflictException('Slug đã tồn tại');
    }

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException('Danh mục không thể là cha của chính nó');
      }
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new BadRequestException('Danh mục cha không tồn tại');
      if (parent.parentId) {
        throw new BadRequestException('Chỉ hỗ trợ tối đa 2 cấp danh mục');
      }
      const hasChildren = await this.prisma.category.count({ where: { parentId: id } });
      if (hasChildren > 0) {
        throw new BadRequestException(
          'Không thể chuyển danh mục này thành danh mục con vì nó đã có danh mục con',
        );
      }
    }

    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { listings: true, children: true } } },
    });
    if (!category) throw new NotFoundException('Danh mục không tồn tại');

    if (category._count.listings > 0) {
      throw new ConflictException(
        `Không thể xóa: còn ${category._count.listings} tin đăng đang dùng danh mục này`,
      );
    }
    if (category._count.children > 0) {
      throw new ConflictException(
        `Không thể xóa: danh mục có ${category._count.children} danh mục con`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Đã xóa danh mục' };
  }

  async seed() {
    // Logo URLs từ simpleicons CDN — đồng bộ với sidebar /listings
    const cdn = (slug: string) => `https://cdn.simpleicons.org/${slug}`;
    const brands = [
      { name: 'Apple',    slug: 'apple',    imageUrl: cdn('apple/000000') },
      { name: 'Samsung',  slug: 'samsung',  imageUrl: cdn('samsung/1428A0') },
      { name: 'Xiaomi',   slug: 'xiaomi',   imageUrl: cdn('xiaomi/FF6900') },
      { name: 'OPPO',     slug: 'oppo',     imageUrl: cdn('oppo/1BA784') },
      { name: 'Vivo',     slug: 'vivo',     imageUrl: cdn('vivo/415FFF') },
      { name: 'Realme',   slug: 'realme',   imageUrl: cdn('realme/FFC915') },
      { name: 'Honor',    slug: 'honor',    imageUrl: cdn('honor/000000') },
      { name: 'Google',   slug: 'google',   imageUrl: cdn('google/4285F4') },
      { name: 'Huawei',   slug: 'huawei',   imageUrl: cdn('huawei/FF0000') },
      { name: 'OnePlus',  slug: 'oneplus',  imageUrl: cdn('oneplus/F5010C') },
      { name: 'Nokia',    slug: 'nokia',    imageUrl: cdn('nokia/124191') },
      { name: 'LG',       slug: 'lg',       imageUrl: cdn('lg/A50034') },
      { name: 'ASUS',     slug: 'asus',     imageUrl: cdn('asus/000000') },
      { name: 'Sony',     slug: 'sony',     imageUrl: cdn('sony/003087') },
      { name: 'Motorola', slug: 'motorola', imageUrl: cdn('motorola/E1140A') },
      { name: 'Lenovo',   slug: 'lenovo',   imageUrl: cdn('lenovo/E2231A') },
    ];

    for (const brand of brands) {
      await this.prisma.category.upsert({
        where: { slug: brand.slug },
        update: { imageUrl: brand.imageUrl },
        create: brand,
      });
    }

    // Backfill: link listings (brand string) → Category record qua tên (không phân biệt hoa thường)
    const linked = await this.backfillListingCategories();

    return {
      message: `Đã seed ${brands.length} thương hiệu, link ${linked} tin đăng vào danh mục`,
    };
  }

  async backfillListingCategories() {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, name: true },
    });
    const byNameLower = new Map(
      categories.map((c) => [c.name.toLowerCase(), c.id]),
    );

    const orphans = await this.prisma.listing.findMany({
      where: { categoryId: null },
      select: { id: true, brand: true },
    });

    let linked = 0;
    for (const l of orphans) {
      const categoryId = byNameLower.get(l.brand.toLowerCase());
      if (categoryId) {
        await this.prisma.listing.update({
          where: { id: l.id },
          data: { categoryId },
        });
        linked++;
      }
    }
    return linked;
  }
}
