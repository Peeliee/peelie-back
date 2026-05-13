import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { ChatService } from './chat.service';
import type { ChatStreamEvent } from './dto/chat-stream.event';
import { ListMessagesDto } from './dto/list-messages.dto';
import type { MessageListResponse } from './dto/message-list.response';
import { SendMessageDto } from './dto/send-message.dto';

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

  // SSE: 사용자 메시지 전송 + 챗봇 멀티 버블 응답.
  // body 받아야 하므로 NestJS @Sse(GET) 안 쓰고 raw Express response 직접 사용.
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

  // SSE: 채팅방 입장 시 호출. 그날 KST 기준 첫 입장이면 봇이 먼저 인사, 아니면 skip.
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
