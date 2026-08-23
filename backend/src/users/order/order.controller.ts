import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto, QueryOrderDto } from './order.dto';
import { JwtAccessGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth.decorator';

@Controller('orders')
@UseGuards(JwtAccessGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // POST /api/orders
  @Post()
  checkout(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.orderService.checkout(user.sub, dto);
  }

  // GET /api/orders
  @Get()
  findMine(@CurrentUser() user: any, @Query() query: QueryOrderDto) {
    return this.orderService.findMine(user.sub, query);
  }

  // GET /api/orders/:id
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.orderService.findOneMine(user.sub, id);
  }

  // PUT /api/orders/:id/cancel
  @Put(':id/cancel')
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.orderService.cancel(user.sub, id);
  }
}