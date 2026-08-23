import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminPaymentService } from './payment.admin.service';
import {
  ConfirmCodPaymentDto,
  QueryAdminPaymentDto,
} from './payment.admin.dto';
import { JwtAccessGuard, RolesGuard } from '../../users/auth/auth.guard';
import { Roles } from '../../users/auth/auth.decorator';

@Controller('admin/payments')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('admin')
export class AdminPaymentController {
  constructor(private readonly adminPaymentService: AdminPaymentService) {}

  @Get()
  findAll(@Query() query: QueryAdminPaymentDto) {
    return this.adminPaymentService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminPaymentService.findOne(id);
  }

  @Post(':id/confirm-cod')
  confirmCod(@Param('id') id: string, @Body() _dto: ConfirmCodPaymentDto) {
    return this.adminPaymentService.confirmCod(id);
  }
}