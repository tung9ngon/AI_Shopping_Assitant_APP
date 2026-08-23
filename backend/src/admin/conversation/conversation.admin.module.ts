import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../../database/conversation.entity';
import { Message } from '../../database/message.entity';
import { ConversationAdminController } from './conversation.admin.controller';
import { ConversationAdminService } from './conversation.admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message])],
  controllers: [ConversationAdminController],
  providers: [ConversationAdminService],
})
export class ConversationAdminModule {}