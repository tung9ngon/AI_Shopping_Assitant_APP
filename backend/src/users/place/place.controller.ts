import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PlaceService } from './place.service';
import {
  AutocompletePlaceDto,
  DistrictsQueryDto,
  ReversePlaceDto,
  WardsQueryDto,
} from './place.dto';
import { JwtAccessGuard } from '../auth/auth.guard';

@Controller('places')
@UseGuards(JwtAccessGuard)
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  // GET /api/places/provinces — 63 tỉnh/thành, cho bộ chọn địa chỉ của app
  @Get('provinces')
  provinces() {
    return this.placeService.provinces();
  }

  // GET /api/places/districts?province_code=...
  @Get('districts')
  districts(@Query() query: DistrictsQueryDto) {
    return this.placeService.districts(query.province_code);
  }

  // GET /api/places/wards?district_code=...
  @Get('wards')
  wards(@Query() query: WardsQueryDto) {
    return this.placeService.wards(query.district_code);
  }

  // GET /api/places/autocomplete?input=...
  @Get('autocomplete')
  autocomplete(@Query() query: AutocompletePlaceDto) {
    return this.placeService.autocomplete(query);
  }

  // GET /api/places/reverse?lat=...&lon=...
  @Get('reverse')
  reverse(@Query() query: ReversePlaceDto) {
    return this.placeService.reverse(query);
  }
}
