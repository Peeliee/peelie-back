import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageRole, Prisma } from '@prisma/client';
import { z } from 'zod';

import { LlmService, type ChatHistoryMessage } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ChatStreamEvent, MessageBubble } from './dto/chat-stream.event';
import type { ListMessagesDto } from './dto/list-messages.dto';
import type { MessageListResponse } from './dto/message-list.response';
import type { MessageResponse } from './dto/message.response';

const StoredBubblesSchema = z.array(
  z.object({
    text: z.string(),
    delayMs: z.number(),
  }),
);

const RECENT_MESSAGE_LIMIT = 10;
const DEFAULT_PAGE_LIMIT = 30;
const MAX_PAGE_LIMIT = 100;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
  ) {}

  async findMessages(
    userId: string,
    chatRoomId: string,
    opts: ListMessagesDto,
  ): Promise<MessageListResponse> {
    await this.assertOwned(userId, chatRoomId);

    const limit = clamp(opts.limit ?? DEFAULT_PAGE_LIMIT, 1, MAX_PAGE_LIMIT);
    const beforeDate = opts.before ? new Date(opts.before) : undefined;

    const rows = await this.prisma.message.findMany({
      where: {
        chatRoomId,
        ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;
    const items: MessageResponse[] = sliced
      .slice()
      .reverse()
      .map((m) => ({
        id: m.id,
        role: m.role,
        bubbles: parseBubbles(m.bubbles),
        suggestions: m.suggestions,
        createdAt: m.createdAt,
      }));

    const nextCursor = hasMore
      ? (items[0]?.createdAt.toISOString() ?? null)
      : null;

    return { items, nextCursor };
  }

  async *streamChatMessage(
    userId: string,
    chatRoomId: string,
    userMessage: string,
  ): AsyncGenerator<ChatStreamEvent> {
    const ctx = await this.loadChatContext(userId, chatRoomId);

    yield {
      event: 'meta',
      data: {
        chatRoomId,
        friendId: ctx.friendUser.id,
        userId: ctx.owner.id,
      },
    };

    const recent = await this.loadRecentMessages(chatRoomId);

    const turn = await this.llmService.generateChatTurn({
      friendPersonality: ctx.friendUser.personality,
      friendName: ctx.friendUser.name,
      userName: ctx.owner.name,
      scheduleDescription: ctx.scheduleDescription,
      daysUntilMeet: daysUntil(ctx.meetDate),
      recentMessages: recent,
      userMessage,
    });

    for (const bubble of turn.bubbles) {
      await sleep(bubble.delayMs);
      yield { event: 'bubble', data: bubble };
    }

    yield { event: 'suggestions', data: turn.suggestions };

    await this.persistChatTurn(
      chatRoomId,
      userMessage,
      turn.bubbles,
      turn.suggestions,
    );

    yield { event: 'done', data: { chatRoomId } };
  }

  async *streamGreeting(
    userId: string,
    chatRoomId: string,
  ): AsyncGenerator<ChatStreamEvent> {
    const ctx = await this.loadChatContext(userId, chatRoomId);

    yield {
      event: 'meta',
      data: {
        chatRoomId,
        friendId: ctx.friendUser.id,
        userId: ctx.owner.id,
      },
    };

    const shouldGreet = shouldSendGreeting(ctx.lastEnteredAt);

    // 진입 시각은 skip/인사 여부와 무관하게 항상 업데이트
    await this.prisma.chatRoom.update({
      where: { id: chatRoomId },
      data: { lastEnteredAt: new Date() },
    });

    if (!shouldGreet) {
      yield { event: 'skip', data: {} };
      return;
    }

    const recent = await this.loadRecentMessages(chatRoomId);

    const turn = await this.llmService.generateGreeting({
      friendPersonality: ctx.friendUser.personality,
      friendName: ctx.friendUser.name,
      userName: ctx.owner.name,
      scheduleDescription: ctx.scheduleDescription,
      daysUntilMeet: daysUntil(ctx.meetDate),
      recentMessages: recent,
    });

    for (const bubble of turn.bubbles) {
      await sleep(bubble.delayMs);
      yield { event: 'bubble', data: bubble };
    }

    yield { event: 'suggestions', data: turn.suggestions };

    await this.prisma.message.create({
      data: {
        chatRoomId,
        role: MessageRole.AVATAR,
        bubbles: turn.bubbles,
        suggestions: turn.suggestions,
      },
    });

    yield { event: 'done', data: { chatRoomId } };
  }

  private async loadChatContext(userId: string, chatRoomId: string) {
    const chatRoom = await this.prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
      include: {
        schedule: {
          select: {
            ownerId: true,
            description: true,
            meetDate: true,
            owner: { select: { id: true, name: true } },
            friendUser: {
              select: { id: true, name: true, personality: true },
            },
          },
        },
      },
    });
    if (!chatRoom) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다');
    }
    if (chatRoom.schedule.ownerId !== userId) {
      throw new ForbiddenException('해당 채팅방 권한이 없습니다');
    }
    return {
      owner: chatRoom.schedule.owner,
      friendUser: chatRoom.schedule.friendUser,
      scheduleDescription: chatRoom.schedule.description,
      meetDate: chatRoom.schedule.meetDate,
      lastEnteredAt: chatRoom.lastEnteredAt,
    };
  }

  private async assertOwned(userId: string, chatRoomId: string): Promise<void> {
    const chatRoom = await this.prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
      select: { schedule: { select: { ownerId: true } } },
    });
    if (!chatRoom) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다');
    }
    if (chatRoom.schedule.ownerId !== userId) {
      throw new ForbiddenException('해당 채팅방 권한이 없습니다');
    }
  }

  private async loadRecentMessages(
    chatRoomId: string,
  ): Promise<ChatHistoryMessage[]> {
    const messages = await this.prisma.message.findMany({
      where: { chatRoomId },
      orderBy: { createdAt: 'desc' },
      take: RECENT_MESSAGE_LIMIT,
    });
    return messages
      .slice()
      .reverse()
      .map((m) => ({
        role: m.role,
        content: parseBubbles(m.bubbles)
          .map((b) => b.text)
          .join('\n'),
      }));
  }

  private async persistChatTurn(
    chatRoomId: string,
    userMessage: string,
    avatarBubbles: MessageBubble[],
    suggestions: string[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          chatRoomId,
          role: MessageRole.USER,
          bubbles: [{ text: userMessage, delayMs: 0 }],
          suggestions: [],
        },
      }),
      this.prisma.message.create({
        data: {
          chatRoomId,
          role: MessageRole.AVATAR,
          bubbles: avatarBubbles as unknown as Prisma.InputJsonValue,
          suggestions,
        },
      }),
    ]);
  }
}

function parseBubbles(bubblesJson: Prisma.JsonValue): MessageBubble[] {
  const parsed = StoredBubblesSchema.safeParse(bubblesJson);
  return parsed.success ? parsed.data : [];
}

function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function shouldSendGreeting(lastEnteredAt: Date | null): boolean {
  if (!lastEnteredAt) return true;
  return kstDateString(lastEnteredAt) !== kstDateString(new Date());
}

function kstDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
