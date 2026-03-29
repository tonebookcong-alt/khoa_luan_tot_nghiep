import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

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
    return this.prisma.category.create({ data: dto });
  }

  async seed() {
    const brands = [
      { name: 'Apple', slug: 'apple' },
      { name: 'Samsung', slug: 'samsung' },
      { name: 'Xiaomi', slug: 'xiaomi' },
      { name: 'OPPO', slug: 'oppo' },
      { name: 'Vivo', slug: 'vivo' },
      { name: 'Realme', slug: 'realme' },
      { name: 'OnePlus', slug: 'oneplus' },
      { name: 'Nokia', slug: 'nokia' },
    ];

    for (const brand of brands) {
      await this.prisma.category.upsert({
        where: { slug: brand.slug },
        update: {},
        create: brand,
      });
    }

    return { message: `Đã seed ${brands.length} thương hiệu` };
  }
}
