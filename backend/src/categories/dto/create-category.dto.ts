import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Apple' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'apple' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ description: 'URL ảnh đại diện danh mục' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'ID của category cha (nếu là subcategory)' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
