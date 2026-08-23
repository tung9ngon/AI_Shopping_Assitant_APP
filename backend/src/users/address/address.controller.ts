import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto, UpdateAddressDto } from './address.dto';
import { JwtAccessGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth.decorator';

@UseGuards(JwtAccessGuard)
@Controller('users/me/addresses')
export class AddressController {
  constructor(private addressService: AddressService) {}

  @Get()
  getMyAddresses(@CurrentUser() user: any) {
    return this.addressService.getMyAddresses(user.sub);
  }

  @Get(':id')
  getMyAddressById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressService.getMyAddressById(user.sub, id);
  }

  @Post()
  createAddress(@CurrentUser() user: any, @Body() dto: CreateAddressDto) {
    return this.addressService.createAddress(user.sub, dto);
  }

  @Put(':id')
  updateAddress(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.updateAddress(user.sub, id, dto);
  }

  @Put(':id/default')
  setDefaultAddress(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressService.setDefaultAddress(user.sub, id);
  }

  @Delete(':id')
  deleteAddress(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressService.deleteAddress(user.sub, id);
  }
}