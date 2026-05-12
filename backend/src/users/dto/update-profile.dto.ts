import { IsString, IsOptional, IsUrl, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Tên ít nhất 2 ký tự' })
  @MaxLength(50, { message: 'Tên tối đa 50 ký tự' })
  @Matches(/^[\p{L}\s]+$/u, {
    message: 'Tên chỉ chứa chữ cái và khoảng trắng (không số, không ký tự đặc biệt)',
  })
  name?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @Matches(/^0\d{9}$/, {
    message: 'Số điện thoại phải gồm 10 số, bắt đầu bằng 0',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'Quận 1, TP.HCM' })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Địa chỉ ít nhất 3 ký tự' })
  @MaxLength(200, { message: 'Địa chỉ tối đa 200 ký tự' })
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  avatar?: string;
}
