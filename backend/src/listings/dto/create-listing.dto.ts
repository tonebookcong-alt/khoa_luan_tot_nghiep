import {
  IsString,
  IsEnum,
  IsInt,
  Min,
  IsOptional,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceCondition } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateListingDto {
  @ApiProperty({ example: 'iPhone 14 Pro Max 256GB Tím Nguyên Seal' })
  @IsString()
  @MinLength(10)
  title: string;

  @ApiProperty({ example: 'Máy còn mới 99%, đầy đủ phụ kiện...' })
  @IsString()
  @MinLength(20)
  description: string;

  @ApiProperty({ enum: DeviceCondition })
  @IsEnum(DeviceCondition)
  condition: DeviceCondition;

  @ApiProperty({ example: 25000000, description: 'Giá đặt (VND)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  askingPrice: number;

  @ApiProperty({ example: 'Apple' })
  @IsString()
  brand: string;

  @ApiProperty({ example: 'iPhone 14 Pro Max' })
  @IsString()
  model: string;

  @ApiPropertyOptional({ example: 'cat_apple_id' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: '256GB' })
  @IsOptional()
  @IsString()
  storage?: string;

  @ApiPropertyOptional({ example: 'Tím' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'Việt Nam' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ example: 'Còn bảo hành' })
  @IsOptional()
  @IsString()
  warranty?: string;

  @ApiPropertyOptional({ example: 'Quốc tế' })
  @IsOptional()
  @IsString()
  iphoneVersion?: string;

  @ApiPropertyOptional({ example: 'Quận 1, TP. Hồ Chí Minh' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'Củ sạc, Cáp sạc' })
  @IsOptional()
  @IsString()
  accessories?: string;
}
