import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../../database/conversation.entity';
import { Message } from '../../database/message.entity';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), ChatModule],
  controllers: [ConversationController],
  providers: [ConversationService],
})
export class ConversationModule {}