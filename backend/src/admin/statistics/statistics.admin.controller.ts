import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminStatisticsService } from './statistics.admin.service';
import { QueryOverviewStatsDto, QueryRevenueStatsDto } from './statistics.admin.dto';
import { JwtAccessGuard, RolesGuard } from '../../users/auth/auth.guard';
import { Roles } from '../../users/auth/auth.decorator';

@Controller('admin/statistics')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('admin')
export class AdminStatisticsController {
  constructor(private readonly adminStatisticsService: AdminStatisticsService) {}

  // GET /api/admin/statistics/overview?from=&to=
  @Get('overview')
  getOverview(@Query() query: QueryOverviewStatsDto) {
    return this.adminStatisticsService.getOverview(query);
  }

  // GET /api/admin/statistics/revenue?groupBy=month|week&from=&to=
  @Get('revenue')
  getRevenue(@Query() query: QueryRevenueStatsDto) {
    return this.adminStatisticsService.getRevenueStats(query);
  }
}