import { IsOptional, IsIn, IsString, MinLength, IsNumberString } from 'class-validator';

// ---------- POST /api/conversations ----------
export class CreateConversationDto {
  @IsOptional()
  @IsIn(['chat', 'voice'])
  channel?: 'chat' | 'voice';
}

// ---------- POST /api/conversations/:id/messages ----------
export class SendMessageDto {
  @IsString()
  @MinLength(1, { message: 'Nội dung tin nhắn không được để trống' })
  content: string;
}

// ---------- GET /api/conversations/:id/messages ----------
export class QueryMessagesDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}