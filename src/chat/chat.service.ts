import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageRole, Prisma } from '@prisma/client';
import { z } from 'zod';

import { kstTodayAsUtc } from '../common/utils/kst';
import { LlmService, type ChatHistoryMessage } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ChatListItem } from './dto/chat-list-item.response';
import type { ChatStreamEvent, MessageBubble } from './dto/chat-stream.event';
import type { ChatRoomListItem } from './dto/chatroom-list-item.response';
import type {
  ChatRoomListSort,
  ListChatRoomsDto,
} from './dto/list-chatrooms.dto';
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

  /**
   * 홈 화면 "대화 중인 목록".
   * 활성 약속(KST 오늘 이후) 의 chatRoom 만 반환.
   * lastMessageAt = 마지막 메시지 createdAt, 없으면 chatRoom.createdAt.
   */
  async findActiveChatRooms(
    userId: string,
    opts: ListChatRoomsDto,
  ): Promise<ChatRoomListItem[]> {
    const sort: ChatRoomListSort = opts.sort ?? 'recent';
    const today = kstTodayAsUtc();

    const rows = await this.prisma.chatRoom.findMany({
      where: {
        schedule: {
          ownerId: userId,
          meetDate: { gte: today },
        },
      },
      select: {
        id: true,
        createdAt: true,
        schedule: {
          select: {
            meetDate: true,
            createdAt: true,
            friendUser: {
              select: {
                id: true,
                name: true,
                personality: true,
                deletedAt: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    const items: ChatRoomListItem[] = rows.map((row) => ({
      chatRoomId: row.id,
      friend: {
        id: row.schedule.friendUser.id,
        name: row.schedule.friendUser.name,
        personality: row.schedule.friendUser.personality,
        isDeleted: row.schedule.friendUser.deletedAt !== null,
      },
      meetDate: row.schedule.meetDate,
      registeredAt: row.schedule.createdAt,
      lastMessageAt: row.messages[0]?.createdAt ?? row.createdAt,
    }));

    items.sort((a, b) => {
      const diff = a.lastMessageAt.getTime() - b.lastMessageAt.getTime();
      return sort === 'recent' ? -diff : diff;
    });

    return items;
  }

  /**
   * AI챗 목록 화면. 모든 chatRoom (과거 약속 포함).
   * 마지막 메시지 미리보기 + 안 읽음 표시 포함. lastMessageAt desc 정렬.
   */
  async findChatList(userId: string): Promise<ChatListItem[]> {
    const rows = await this.prisma.chatRoom.findMany({
      where: { schedule: { ownerId: userId } },
      select: {
        id: true,
        createdAt: true,
        lastReadAt: true,
        schedule: {
          select: {
            friendUser: {
              select: {
                id: true,
                name: true,
                personality: true,
                deletedAt: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, bubbles: true },
        },
      },
    });

    const items: ChatListItem[] = rows.map((row) => {
      const lastMsg = row.messages[0];
      const lastMessageAt = lastMsg?.createdAt ?? row.createdAt;
      const lastMessagePreview = lastMsg
        ? truncate(lastBubbleText(lastMsg.bubbles), 60)
        : null;
      const isUnread =
        lastMsg !== undefined &&
        (!row.lastReadAt || lastMessageAt > row.lastReadAt);
      return {
        chatRoomId: row.id,
        friend: {
          id: row.schedule.friendUser.id,
          name: row.schedule.friendUser.name,
          personality: row.schedule.friendUser.personality,
          isDeleted: row.schedule.friendUser.deletedAt !== null,
        },
        lastMessageAt,
        lastMessagePreview,
        isUnread,
      };
    });

    items.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
    return items;
  }

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

    if (ctx.friendUser.deletedAt !== null) {
      throw new BadRequestException(
        '탈뢰한 사용자와는 새 대화를 할 수 없습니다',
      );
    }

    await this.assertActiveFriendship(userId, ctx.friendUser.id);

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

    if (ctx.friendUser.deletedAt !== null) {
      throw new BadRequestException(
        '탈뢰한 사용자와는 새 대화를 할 수 없습니다',
      );
    }

    await this.assertActiveFriendship(userId, ctx.friendUser.id);

    yield {
      event: 'meta',
      data: {
        chatRoomId,
        friendId: ctx.friendUser.id,
        userId: ctx.owner.id,
      },
    };

    const shouldGreet = shouldSendGreeting(ctx.lastEnteredAt);

    // 진입 시각 + 읽음 시각 둘 다 항상 업데이트 (skip 여부와 무관)
    const now = new Date();
    await this.prisma.chatRoom.update({
      where: { id: chatRoomId },
      data: { lastEnteredAt: now, lastReadAt: now },
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

  async markRead(userId: string, chatRoomId: string): Promise<void> {
    await this.assertOwned(userId, chatRoomId);
    await this.prisma.chatRoom.update({
      where: { id: chatRoomId },
      data: { lastReadAt: new Date() },
    });
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
              select: {
                id: true,
                name: true,
                personality: true,
                deletedAt: true,
              },
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

  /**
   * 현재도 친구 관계가 유효한지 검사. 친구 삭제 후에는 새 stream 차단.
   * (옛 메시지 조회는 GET /messages 로 계속 가능)
   */
  private async assertActiveFriendship(
    ownerId: string,
    friendUserId: string,
  ): Promise<void> {
    const friendship = await this.prisma.friendship.findUnique({
      where: { ownerId_friendUserId: { ownerId, friendUserId } },
      select: { id: true },
    });
    if (!friendship) {
      throw new BadRequestException(
        '친구 관계가 없어 새 대화를 시작할 수 없습니다',
      );
    }
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

function lastBubbleText(bubblesJson: Prisma.JsonValue): string {
  const bubbles = parseBubbles(bubblesJson);
  return bubbles[bubbles.length - 1]?.text ?? '';
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
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
