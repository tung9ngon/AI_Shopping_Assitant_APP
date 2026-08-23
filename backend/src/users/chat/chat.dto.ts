import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class ChatMessageDto {
  role: 'user' | 'model';
  text: string;
}

// POST /api/chat
export class ChatDto {
  @IsString()
  @MaxLength(2000)
  message: string;

  // Lịch sử hội thoại (chỉ text). role: 'user' | 'model'.
  @IsOptional()
  @IsArray()
  history?: ChatMessageDto[];
}
