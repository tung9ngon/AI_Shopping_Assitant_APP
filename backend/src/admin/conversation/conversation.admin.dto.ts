import { IsOptional, IsIn, IsNumberString, IsDateString } from 'class-validator';

// ---------- GET /api/admin/conversations (query) ----------
export class QueryConversationsAdminDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsIn(['chat', 'voice'])
  channel?: 'chat' | 'voice';

  // Lọc theo khoảng thời gian started_at
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}