import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [ConfigModule, ProductModule], // ProductModule export ProductService
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
