import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ConversationAdminService } from './conversation.admin.service';
import { QueryConversationsAdminDto } from './conversation.admin.dto';
import { JwtAccessGuard, RolesGuard } from '../../users/auth/auth.guard';
import { Roles } from '../../users/auth/auth.decorator';

@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('admin')
@Controller('admin/conversations')
export class ConversationAdminController {
  constructor(private conversationAdminService: ConversationAdminService) {}

  @Get()
  findAll(@Query() query: QueryConversationsAdminDto) {
    return this.conversationAdminService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conversationAdminService.findOneDetail(id);
  }
}