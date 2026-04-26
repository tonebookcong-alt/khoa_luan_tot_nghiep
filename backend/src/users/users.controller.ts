import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin cá nhân' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.findById(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem profile công khai của người dùng' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  // Admin endpoints
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] Danh sách người dùng' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.findAll(Number(page), Number(limit));
  }

  @Patch(':id/admin')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] Cập nhật role hoặc ban user' })
  adminUpdate(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.usersService.adminUpdate(id, dto);
  }

  @Post('block/:blockedId')
  @ApiOperation({ summary: 'Chặn người dùng' })
  blockUser(@CurrentUser() user: JwtPayload, @Param('blockedId') blockedId: string) {
    return this.usersService.blockUser(user.sub, blockedId);
  }

  @Delete('block/:blockedId')
  @ApiOperation({ summary: 'Bỏ chặn người dùng' })
  unblockUser(@CurrentUser() user: JwtPayload, @Param('blockedId') blockedId: string) {
    return this.usersService.unblockUser(user.sub, blockedId);
  }
}
