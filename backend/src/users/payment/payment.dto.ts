import { IsIn, IsUUID } from 'class-validator';

// ---------- POST /api/payments ----------
export class CreatePaymentDto {
  @IsUUID()
  order_id: string;

  @IsIn(['cod', 'payos'])
  method: 'cod' | 'payos';
}