import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ description: 'ID tin đăng muốn mua' })
  @IsString()
  @IsNotEmpty()
  listingId: string;
}