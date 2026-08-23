import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto, SendMessageDto, QueryMessagesDto } from './conversation.dto';
import { JwtAccessGuard, OptionalJwtAccessGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth.decorator';

@Controller('conversations')
export class ConversationController {
  constructor(private conversationService: ConversationService) {}

  // Cho phép guest bắt đầu hội thoại (user_id NULL nếu chưa đăng nhập)
  @UseGuards(OptionalJwtAccessGuard)
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateConversationDto) {
    return this.conversationService.create(user?.sub ?? null, dto);
  }

  // "của tôi" -> bắt buộc đăng nhập, guest không có danh sách để liệt kê
  @UseGuards(JwtAccessGuard)
  @Get()
  findMine(@CurrentUser() user: any) {
    return this.conversationService.findMine(user.sub);
  }

  // Guest vẫn xem được cuộc hội thoại guest của chính mình (đã có id từ bước POST)
  @UseGuards(OptionalJwtAccessGuard)
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.conversationService.findOne(id, user?.sub ?? null);
  }

  @UseGuards(OptionalJwtAccessGuard)
  @Post(':id/messages')
  sendMessage(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.conversationService.sendMessage(id, user?.sub ?? null, dto);
  }

  @UseGuards(OptionalJwtAccessGuard)
  @Get(':id/messages')
  getMessages(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query() query: QueryMessagesDto,
  ) {
    return this.conversationService.getMessages(id, user?.sub ?? null, query);
  }
}