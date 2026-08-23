import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { DiscountCodeService } from './discountcode.service';
import { ListDiscountCodeDto, ValidateDiscountCodeDto } from './discountcode.dto';

@Controller('discount-codes')
export class DiscountCodeController {
  constructor(private readonly discountCodeService: DiscountCodeService) {}

  // GET /api/discount-codes
  @Get()
  listDiscountCodes(@Query() query: ListDiscountCodeDto) {
    return this.discountCodeService.listDiscountCodes(query);
  }

  // GET /api/discount-codes/freeship
  @Get('freeship')
  listFreeshipCodes(@Query() query: ListDiscountCodeDto) {
    return this.discountCodeService.listFreeshipCodes(query);
  }

  // POST /api/discount-codes/validate
  @Post('validate')
  @HttpCode(200)
  validate(@Body() dto: ValidateDiscountCodeDto) {
    return this.discountCodeService.validate(dto);
  }
}