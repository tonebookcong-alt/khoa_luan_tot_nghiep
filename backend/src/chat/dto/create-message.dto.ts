import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiPropertyOptional({ description: 'Nội dung tin nhắn (bỏ trống khi gửi media)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;
}
