import { IsDateString, IsIn, IsOptional } from 'class-validator';

// GET /api/admin/statistics/overview
export class QueryOverviewStatsDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

// GET /api/admin/statistics/revenue
export class QueryRevenueStatsDto {
  
  @IsOptional()
  @IsIn(['week', 'month'])
  groupBy?: 'week' | 'month' = 'month';

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}