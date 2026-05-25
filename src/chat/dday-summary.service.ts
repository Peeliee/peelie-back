import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Prisma } from '@prisma/client';

import { kstTodayAsUtc } from '../common/utils/kst';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import type { TodayDDayItem } from './dto/today-dday.response';

const RECENT_MESSAGES_FOR_SUMMARY = 50;
const BUBBLE_FALLBACK = '';

const STORED_BUBBLES = Symbol('storedBubbles');
type StoredBubble = { text: string } | string;

@Injectable()
export class DDaySummaryService {
  private readonly logger = new Logger(DDaySummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
  ) {}

  /**
   * 매일 KST 06:00 (UTC 21:00 전날) 에 D-day 인 모든 ChatRoom 의 요약 생성.
   * 실패한 chatRoom 은 로그만 남기고 다음 row 로 진행.
   */
  @Cron('0 6 * * *', { timeZone: 'Asia/Seoul' })
  async generateDailySummaries(): Promise<void> {
    const today = kstTodayAsUtc();
    const chatRooms = await this.prisma.chatRoom.findMany({
      where: {
        schedule: { meetDate: today },
      },
      select: {
        id: true,
        schedule: {
          select: {
            description: true,
            owner: { select: { name: true } },
            friendUser: {
              select: { name: true, personality: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: RECENT_MESSAGES_FOR_SUMMARY,
          select: { role: true, bubbles: true },
        },
      },
    });

    this.logger.log(`D-day 요약 대상 ${chatRooms.length}건 처리 시작`);

    for (const room of chatRooms) {
      try {
        const summary = await this.llmService.summarizeConversation({
          friendPersonality: room.schedule.friendUser.personality,
          friendName: room.schedule.friendUser.name,
          userName: room.schedule.owner.name,
          scheduleDescription: room.schedule.description,
          messages: room.messages.map((m) => ({
            role: m.role,
            content: extractBubblesText(m.bubbles),
          })),
        });
        await this.prisma.chatRoom.update({
          where: { id: room.id },
          data: { summary, summaryGeneratedAt: new Date() },
        });
      } catch (error) {
        await this.prisma.chatRoom.update({
          where: { id: room.id },
          data: { summary: null, summaryGeneratedAt: new Date() },
        });
        this.logger.warn(
          `chatRoom ${room.id} 요약 실패: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }

    this.logger.log('D-day 요약 처리 완료');
  }

  /**
   * 본인 입장에서 오늘(KST) D-day 인 약속 + 요약.
   */
  async findTodayDDayForUser(userId: string): Promise<TodayDDayItem[]> {
    const today = kstTodayAsUtc();
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        schedule: {
          ownerId: userId,
          meetDate: today,
        },
      },
      select: {
        id: true,
        summary: true,
        schedule: {
          select: {
            id: true,
            meetDate: true,
            description: true,
            friendUser: {
              select: { id: true, name: true, personality: true },
            },
          },
        },
      },
    });

    return rooms.map((room) => ({
      scheduleId: room.schedule.id,
      chatRoomId: room.id,
      friend: room.schedule.friendUser,
      meetDate: room.schedule.meetDate,
      description: room.schedule.description,
      summary: room.summary,
    }));
  }
}

/**
 * Message.bubbles 는 JSON. 우리 저장 포맷:
 *   AVATAR: [{text, delayMs}, ...]
 *   USER:   [{text, delayMs: 0}]  (구버전) 또는  ["..."]  (신버전)
 * 텍스트만 추출해 단일 string 으로 join.
 */
function extractBubblesText(bubblesJson: Prisma.JsonValue): string {
  if (!Array.isArray(bubblesJson)) return BUBBLE_FALLBACK;
  return (bubblesJson as StoredBubble[])
    .map((b) => (typeof b === 'string' ? b : (b?.text ?? '')))
    .filter((t) => t.length > 0)
    .join(' ');
}

void STORED_BUBBLES;
