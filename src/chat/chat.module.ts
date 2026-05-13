import { Module } from '@nestjs/common';

import { ChatListController } from './chat-list.controller';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  controllers: [ChatController, ChatListController],
  providers: [ChatService],
})
export class ChatModule {}
