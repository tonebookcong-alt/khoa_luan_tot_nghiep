import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ListingStatus, TransactionStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { AdminUpdateUserDto } from '../users/dto/admin-update-user.dto';

class UpdateListingStatusDto {
  @IsEnum(ListingStatus)
  status: ListingStatus;
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
  ) {}

  // ── Stats ──────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'KPI tổng quan hệ thống' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('stats/price-history')
  @ApiOperation({ summary: 'Biến động giá theo model' })
  @ApiQuery({ name: 'model', required: false })
  @ApiQuery({ name: 'brand', required: false })
  getPriceHistory(
    @Query('model') model?: string,
    @Query('brand') brand?: string,
  ) {
    return this.adminService.getPriceHistory(model, brand);
  }

  @Get('stats/commission')
  @ApiOperation({ summary: 'Doanh thu hoa hồng theo tháng' })
  getCommissionByMonth() {
    return this.adminService.getCommissionByMonth();
  }

  // ── Users ──────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'Danh sách người dùng (phân trang)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getUsers(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.usersService.findAll(+page, +limit);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Cập nhật role hoặc ban/unban user' })
  updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.usersService.adminUpdate(id, dto);
  }

  // ── Listings ───────────────────────────────────────────────────────

  @Get('listings')
  @ApiOperation({ summary: 'Danh sách tin đăng (phân trang + filter theo status)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ListingStatus })
  getListings(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: ListingStatus,
  ) {
    return this.adminService.getListings(+page, +limit, status);
  }

  @Patch('listings/:id/status')
  @ApiOperation({ summary: 'Cập nhật status tin đăng (approve/reject)' })
  updateListingStatus(
    @Param('id') id: string,
    @Body() dto: UpdateListingStatusDto,
  ) {
    return this.adminService.updateListingStatus(id, dto.status);
  }

  // ── Transactions ───────────────────────────────────────────────────

  @Get('transactions')
  @ApiOperation({ summary: 'Danh sách giao dịch (phân trang + filter)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus })
  getTransactions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: TransactionStatus,
  ) {
    return this.adminService.getTransactions(+page, +limit, status);
  }
}
