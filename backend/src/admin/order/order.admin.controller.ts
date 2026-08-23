import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminOrderService } from './order.admin.service';
import { QueryAdminOrderDto, UpdateOrderStatusDto } from './order.admin.dto';
import { JwtAccessGuard, RolesGuard } from '../../users/auth/auth.guard';
import { Roles } from '../../users/auth/auth.decorator';

@Controller('admin/orders')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('admin')
export class AdminOrderController {
  constructor(private readonly adminOrderService: AdminOrderService) {}

  // GET /api/admin/orders
  @Get()
  findAll(@Query() query: QueryAdminOrderDto) {
    return this.adminOrderService.findAll(query);
  }

  // GET /api/admin/orders/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminOrderService.findOne(id);
  }

  // PUT /api/admin/orders/:id/status
  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.adminOrderService.updateStatus(id, dto);
  }
}