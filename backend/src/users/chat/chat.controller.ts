import { Body, Controller, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatDto } from './chat.dto';

// Public: chat widget dùng được cả khi chưa đăng nhập.
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  chat(@Body() dto: ChatDto) {
    return this.chatService.chat(dto);
  }
}
