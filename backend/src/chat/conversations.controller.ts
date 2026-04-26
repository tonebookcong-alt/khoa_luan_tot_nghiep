import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';

const chatStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `chat-${unique}${extname(file.originalname)}`);
  },
});

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo hoặc lấy cuộc trò chuyện theo listing' })
  create(@Body() dto: CreateConversationDto, @CurrentUser() user: JwtPayload) {
    return this.conversationsService.create(dto.listingId, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách cuộc trò chuyện của user' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.conversationsService.findAllForUser(user.sub);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Lấy tin nhắn trong cuộc trò chuyện' })
  getMessages(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.conversationsService.getMessages(id, user.sub);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Gửi tin nhắn (REST fallback, hỗ trợ file)' })
  @UseInterceptors(FileInterceptor('file', { storage: chatStorage }))
  sendMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    const mediaUrl = file ? `/uploads/${file.filename}` : undefined;
    return this.conversationsService.createMessage(id, user.sub, dto.content ?? '', mediaUrl);
  }
}
