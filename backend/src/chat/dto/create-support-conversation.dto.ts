import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateSupportConversationDto {
  @ApiProperty({ description: 'ID của admin user muốn liên hệ hỗ trợ' })
  @IsString()
  adminId!: string;
}
