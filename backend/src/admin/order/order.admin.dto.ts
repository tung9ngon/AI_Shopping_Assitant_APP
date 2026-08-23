import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { OrderStatus } from '../../database/order.entity';

const ORDER_STATUSES: OrderStatus[] = [
  'simulated_success',
  'cancelled',
  'pending',
  'paid',
  'shipped',
];

// GET /api/admin/orders
export class QueryAdminOrderDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: OrderStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

// PUT /api/admin/orders/:id/status
export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES)
  status: OrderStatus;
}