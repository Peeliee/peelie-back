import { Module } from '@nestjs/common';

import { ChatListController } from './chat-list.controller';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DDaySummaryService } from './dday-summary.service';
import { TodayDDayController } from './today-dday.controller';

@Module({
  controllers: [ChatController, ChatListController, TodayDDayController],
  providers: [ChatService, DDaySummaryService],
})
export class ChatModule {}
