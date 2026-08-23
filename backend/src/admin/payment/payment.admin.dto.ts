import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

// GET /api/admin/payments
export class QueryAdminPaymentDto {
  @IsOptional()
  @IsIn(['cod', 'payos'])
  method?: 'cod' | 'payos';

  @IsOptional()
  @IsIn(['pending', 'success', 'failed', 'refunded'])
  status?: 'pending' | 'success' | 'failed' | 'refunded';

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

// POST /api/admin/payments/:id/confirm-cod
export class ConfirmCodPaymentDto {}