import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiOkResponseWrapped } from '../common/decorators/api-ok-response-wrapped.decorator';
import { ChatService } from './chat.service';
import { ChatListItem } from './dto/chat-list-item.response';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@Controller('chat-list')
export class ChatListController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @ApiOperation({
    summary: 'AI챗 목록 (모든 chatRoom, 미리보기 + 안 읽음 포함)',
    description:
      '모든 채팅방 (과거 약속도 포함). lastMessageAt desc 정렬. ' +
      'lastMessagePreview 는 마지막 메시지의 bubbles 텍스트 join + 60자 자름. ' +
      'isUnread 는 lastMessageAt > lastReadAt 일 때 true (lastReadAt 은 채팅방 진입/메시지 송수신 시 자동 갱신).',
  })
  @ApiOkResponseWrapped(ChatListItem, { isArray: true })
  list(@CurrentUser() user: AuthUser): Promise<ChatListItem[]> {
    return this.chatService.findChatList(user.id);
  }
}
