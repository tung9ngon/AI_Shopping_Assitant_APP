import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [ConfigModule, ProductModule], // ProductModule export ProductService
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService], // ConversationModule dùng lại để sinh câu trả lời của agent
})
export class ChatModule {}
