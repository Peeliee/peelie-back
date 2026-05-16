import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiOkResponseWrapped } from '../common/decorators/api-ok-response-wrapped.decorator';
import { ChatService } from './chat.service';
import type { ChatStreamEvent } from './dto/chat-stream.event';
import { ChatRoomListItem } from './dto/chatroom-list-item.response';
import { ListChatRoomsDto } from './dto/list-chatrooms.dto';
import { ListMessagesDto } from './dto/list-messages.dto';
import { MessageListResponse } from './dto/message-list.response';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@Controller('chatrooms')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @ApiOperation({
    summary: '내 채팅방 목록 (홈 화면 "대화 중인 목록")',
    description:
      'KST 오늘 이후 약속의 chatRoom 만. ' +
      'lastMessageAt = 마지막 메시지 시각 (USER+AVATAR 둘 다), 메시지 없으면 chatRoom.createdAt. ' +
      'sort=recent (default): 최신순. sort=stale: 오래된 순.',
  })
  @ApiOkResponseWrapped(ChatRoomListItem, { isArray: true })
  listChatRooms(
    @CurrentUser() user: AuthUser,
    @Query() query: ListChatRoomsDto,
  ): Promise<ChatRoomListItem[]> {
    return this.chatService.findActiveChatRooms(user.id, query);
  }

  @Get(':chatRoomId/messages')
  @ApiOperation({
    summary: '채팅방 메시지 목록 (cursor 페이징)',
    description:
      '?before=ISO 로 그 시점 이전 메시지를 limit 개수만큼. default 30, max 100. ' +
      'items 는 asc 순서. nextCursor=null 이면 더 이상 없음.',
  })
  @ApiOkResponseWrapped(MessageListResponse)
  list(
    @CurrentUser() user: AuthUser,
    @Param('chatRoomId') chatRoomId: string,
    @Query() query: ListMessagesDto,
  ): Promise<MessageListResponse> {
    return this.chatService.findMessages(user.id, chatRoomId, query);
  }

  @Post(':chatRoomId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '채팅방 읽음 처리',
    description: [
      '사용자가 이 채팅방의 어디까지 봤는지 서버에 기록 (lastReadAt = now()).',
      '',
      '**호출 시점 (프론트 가이드)**',
      '- 채팅방 진입 시: greeting/stream 이 기존 메시지 read 처리를 겸하므로 별도 호출 생략 가능',
      '- messages/stream done 시: 현재도 해당 채팅방 route 이고 화면 visible 이면 호출',
      '- greeting/stream done 시: 새 greeting 메시지가 생성됐고 화면 visible 이면 호출',
      '- 채팅방 unmount 또는 visibilitychange hidden 직전: 해당 채팅방 화면을 보고 있던 상태면 호출',
      '',
      '응답 wrap 미적용 (204 No Content).',
    ].join('\n'),
  })
  @ApiNoContentResponse()
  async markRead(
    @CurrentUser() user: AuthUser,
    @Param('chatRoomId') chatRoomId: string,
  ): Promise<void> {
    await this.chatService.markRead(user.id, chatRoomId);
  }

  /**
   * 사용자 메시지를 보내고 챗봇 멀티 버블 + 선지를 SSE 로 받음.
   * 이벤트 순서: meta → bubble × 1~4 → suggestions → done (실패 시 error).
   * 응답 wrap 미적용 (text/event-stream raw).
   */
  @Post(':chatRoomId/messages/stream')
  @ApiOperation({
    summary: '챗봇 메시지 보내기 (SSE)',
    description:
      'SSE 응답. event: meta → bubble × 1~4 → suggestions → done (or error). ' +
      'bubble.delayMs 만큼 기다린 후 다음 bubble 도달. 첫 bubble 은 항상 1500ms. ' +
      '응답 wrap 미적용 (text/event-stream).',
  })
  @ApiProduces('text/event-stream')
  async streamMessage(
    @CurrentUser() user: AuthUser,
    @Param('chatRoomId') chatRoomId: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    initSseHeaders(res);
    try {
      for await (const event of this.chatService.streamChatMessage(
        user.id,
        chatRoomId,
        dto.message,
      )) {
        writeSseEvent(res, event);
      }
    } catch (error) {
      writeSseEvent(res, {
        event: 'error',
        data: { message: errorMessage(error, '챗봇 응답 생성 실패') },
      });
    }
    res.end();
  }

  /**
   * 채팅방 입장 시 호출. 그날(KST) 첫 입장이면 봇이 먼저 인사, 아니면 즉시 skip.
   * 클라는 매번 호출하면 됨. 날짜 계산은 서버가 lastEnteredAt 기준 KST 비교.
   */
  @Post(':chatRoomId/greeting/stream')
  @ApiOperation({
    summary: '선제 인사 (SSE)',
    description:
      '채팅방 진입 시 호출. lastEnteredAt 의 KST 날짜 ≠ 오늘 KST 날짜면 인사, ' +
      '같으면 event: skip 즉시 종료. 두 경우 모두 lastEnteredAt=now() 업데이트. ' +
      '응답 wrap 미적용 (text/event-stream).',
  })
  @ApiProduces('text/event-stream')
  async streamGreeting(
    @CurrentUser() user: AuthUser,
    @Param('chatRoomId') chatRoomId: string,
    @Res() res: Response,
  ): Promise<void> {
    initSseHeaders(res);
    try {
      for await (const event of this.chatService.streamGreeting(
        user.id,
        chatRoomId,
      )) {
        writeSseEvent(res, event);
      }
    } catch (error) {
      writeSseEvent(res, {
        event: 'error',
        data: { message: errorMessage(error, '인사 생성 실패') },
      });
    }
    res.end();
  }
}

function initSseHeaders(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

function writeSseEvent(res: Response, event: ChatStreamEvent): void {
  res.write(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
