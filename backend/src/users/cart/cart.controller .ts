import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './cart.dto';
import { JwtAccessGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth.decorator';

@Controller('cart')
@UseGuards(JwtAccessGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // GET /api/cart
  @Get()
  getMyCart(@CurrentUser() user: any) {
    return this.cartService.getMyCart(user.sub);
  }

  // POST /api/cart/items
  @Post('items')
  addItem(@CurrentUser() user: any, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.sub, dto);
  }

  // PUT /api/cart/items/:id
  @Put('items/:id')
  updateItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.sub, id, dto);
  }

  // DELETE /api/cart/items/:id
  @Delete('items/:id')
  removeItem(@CurrentUser() user: any, @Param('id') id: string) {
    return this.cartService.removeItem(user.sub, id);
  }
}