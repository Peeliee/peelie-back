import { MessageRole, PersonalityType } from '@prisma/client';

import type { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';

function createService() {
  const prisma = {
    chatRoom: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const llmService = {
    generateChatTurn: jest.fn(),
    generateGreeting: jest.fn(),
  };

  const service = new ChatService(
    prisma as unknown as PrismaService,
    llmService,
  );

  return { llmService, prisma, service };
}

describe('ChatService', () => {
  it('marks a chat room as read explicitly', async () => {
    const { prisma, service } = createService();
    prisma.chatRoom.findUnique.mockResolvedValue({
      schedule: { ownerId: 'user-1' },
    });
    prisma.chatRoom.update.mockResolvedValue({});

    await service.markRead('user-1', 'chatroom-1');

    expect(prisma.chatRoom.update).toHaveBeenCalledWith({
      where: { id: 'chatroom-1' },
      data: { lastReadAt: expect.any(Date) as Date },
    });
  });

  it('does not mark a streamed chat turn as read automatically', async () => {
    const { llmService, prisma, service } = createService();
    prisma.chatRoom.findUnique.mockResolvedValue({
      lastEnteredAt: null,
      schedule: {
        ownerId: 'user-1',
        description: '커피 마시기',
        meetDate: new Date('2026-05-20T00:00:00.000Z'),
        owner: { id: 'user-1', name: '나' },
        friendUser: {
          id: 'friend-1',
          name: '친구',
          personality: PersonalityType.STRAIGHT_SHOOTER,
          deletedAt: null,
        },
      },
    });
    prisma.message.findMany.mockResolvedValue([]);
    prisma.message.create
      .mockReturnValueOnce({ role: MessageRole.USER })
      .mockReturnValueOnce({ role: MessageRole.AVATAR });
    prisma.$transaction.mockResolvedValue([]);
    llmService.generateChatTurn.mockResolvedValue({
      bubbles: [],
      suggestions: ['좋아', '글쎄', '나중에'],
    });

    const events: string[] = [];
    for await (const event of service.streamChatMessage(
      'user-1',
      'chatroom-1',
      '안녕',
    )) {
      events.push(event.event);
    }

    expect(events).toEqual(['meta', 'suggestions', 'done']);
    expect(prisma.chatRoom.update).not.toHaveBeenCalled();
  });

  it('reports unread when the latest message is newer than lastReadAt', async () => {
    const { prisma, service } = createService();
    prisma.chatRoom.findMany.mockResolvedValue([
      {
        id: 'chatroom-1',
        createdAt: new Date('2026-05-16T00:00:00.000Z'),
        lastReadAt: new Date('2026-05-16T00:00:01.000Z'),
        schedule: {
          friendUser: {
            id: 'friend-1',
            name: '친구',
            personality: PersonalityType.STRAIGHT_SHOOTER,
            deletedAt: null,
          },
        },
        messages: [
          {
            createdAt: new Date('2026-05-16T00:00:02.000Z'),
            bubbles: [{ text: '답장', delayMs: 0 }],
          },
        ],
      },
    ]);

    await expect(service.findChatList('user-1')).resolves.toMatchObject([
      { chatRoomId: 'chatroom-1', isUnread: true },
    ]);
  });
});
