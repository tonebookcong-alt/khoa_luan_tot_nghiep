import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ description: 'ID tin đăng muốn liên hệ' })
  @IsString()
  @IsNotEmpty()
  listingId: string;
}