import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { ChatService } from './chat.service';
import type { ChatStreamEvent } from './dto/chat-stream.event';
import { ListMessagesDto } from './dto/list-messages.dto';
import type { MessageListResponse } from './dto/message-list.response';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@Controller('chatrooms')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':chatRoomId/messages')
  list(
    @CurrentUser() user: AuthUser,
    @Param('chatRoomId') chatRoomId: string,
    @Query() query: ListMessagesDto,
  ): Promise<MessageListResponse> {
    return this.chatService.findMessages(user.id, chatRoomId, query);
  }

  /**
   * 사용자 메시지를 보내고 챗봇 멀티 버블 + 선지를 SSE 로 받는다.
   * 이벤트 순서: meta → bubble × 1~4 → suggestions → done (실패 시 error).
   * 응답 wrap 미적용 (text/event-stream raw).
   */
  @ApiOperation({ summary: '챗봇 메시지 보내기 (SSE)' })
  @Post(':chatRoomId/messages/stream')
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
   * 응답 wrap 미적용 (text/event-stream raw).
   */
  @ApiOperation({ summary: '선제 인사 (SSE)' })
  @Post(':chatRoomId/greeting/stream')
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
