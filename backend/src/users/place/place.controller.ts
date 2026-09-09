import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PlaceService } from './place.service';
import { AutocompletePlaceDto } from './place.dto';
import { JwtAccessGuard } from '../auth/auth.guard';

@Controller('places')
@UseGuards(JwtAccessGuard)
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  // GET /api/places/autocomplete?input=...
  @Get('autocomplete')
  autocomplete(@Query() query: AutocompletePlaceDto) {
    return this.placeService.autocomplete(query);
  }
}
