import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PriceAlertService } from './pricealert.service';
import { CreatePriceAlertDto } from './pricealert.dto';
import { JwtAccessGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth.decorator';

@Controller('price-alerts')
@UseGuards(JwtAccessGuard)
export class PriceAlertController {
  constructor(private readonly priceAlertService: PriceAlertService) {}

  // GET /api/price-alerts
  @Get()
  findMine(@CurrentUser() user: any) {
    return this.priceAlertService.findMine(user.sub);
  }

  // POST /api/price-alerts
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreatePriceAlertDto) {
    return this.priceAlertService.create(user.sub, dto);
  }

  // DELETE /api/price-alerts/:id
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.priceAlertService.remove(user.sub, id);
  }
}