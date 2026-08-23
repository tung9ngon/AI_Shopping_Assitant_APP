import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminDiscountCodeService } from './discountcode.admin.service';
import {
  CreateDiscountCodeDto,
  QueryDiscountCodeDto,
  UpdateDiscountCodeDto,
} from './discountcode.admin.dto';
import { JwtAccessGuard, RolesGuard } from '../../users/auth/auth.guard';
import { Roles } from '../../users/auth/auth.decorator';

@Controller('admin/discount-codes')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('admin')
export class AdminDiscountCodeController {
  constructor(
    private readonly adminDiscountCodeService: AdminDiscountCodeService,
  ) {}

  @Get()
  findAll(@Query() query: QueryDiscountCodeDto) {
    return this.adminDiscountCodeService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateDiscountCodeDto) {
    return this.adminDiscountCodeService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDiscountCodeDto) {
    return this.adminDiscountCodeService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminDiscountCodeService.remove(id);
  }
}