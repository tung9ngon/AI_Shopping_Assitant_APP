import { Controller, Get, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ProfileAdminService } from './profile.admin.service';
import { QueryUsersDto, AdminUpdateUserDto } from './profile.admin.dto';
import { JwtAccessGuard, RolesGuard } from '../../users/auth/auth.guard';
import { Roles } from '../../users/auth/auth.decorator';

// Bắt buộc đăng nhập VÀ role admin. Thứ tự guard quan trọng: JwtAccessGuard
// chạy trước để gắn request.user, RolesGuard chạy sau để đọc user.role.
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('admin')
@Controller('admin/users')
export class ProfileAdminController {
  constructor(private profileAdminService: ProfileAdminService) {}

  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.profileAdminService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profileAdminService.findOneDetail(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.profileAdminService.updateStatusOrRole(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.profileAdminService.remove(id);
  }
}