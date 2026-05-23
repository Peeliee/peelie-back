import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { kstTodayAsUtc } from '../common/utils/kst';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateScheduleDto } from './dto/create-schedule.dto';
import type {
  ListSchedulesDto,
  ScheduleFilter,
  ScheduleOrder,
} from './dto/list-schedules.dto';
import type { ScheduleResponse } from './dto/schedule.response';

const SCHEDULE_SELECT = {
  id: true,
  meetDate: true,
  description: true,
  createdAt: true,
  friendUser: {
    select: { id: true, name: true, personality: true },
  },
  chatRoom: {
    select: { id: true },
  },
} as const;

type ScheduleRow = Omit<ScheduleResponse, 'chatRoom'> & {
  chatRoom: { id: string } | null;
};

// Schema 상 Schedule:ChatRoom 은 1:0..1 이지만 우리는 등록 시점에 항상 같이 생성한다.
// 따라서 null 은 데이터 정합성 깨짐 → 명시적으로 에러.
function assertChatRoom(row: ScheduleRow): ScheduleResponse {
  if (!row.chatRoom) {
    throw new Error(`Schedule ${row.id} has no chat room`);
  }
  return { ...row, chatRoom: row.chatRoom };
}

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(
    ownerId: string,
    opts: ListSchedulesDto,
  ): Promise<ScheduleResponse[]> {
    const filter: ScheduleFilter = opts.filter ?? 'upcoming';
    const order: ScheduleOrder = opts.order ?? 'desc';
    const where: Prisma.ScheduleWhereInput = { ownerId };

    if (filter !== 'all') {
      const today = kstTodayAsUtc();
      where.meetDate = filter === 'upcoming' ? { gte: today } : { lt: today };
    }

    const rows = await this.prisma.schedule.findMany({
      where,
      orderBy: { meetDate: order },
      select: SCHEDULE_SELECT,
    });
    return rows.map(assertChatRoom);
  }

  async findOneForUser(
    ownerId: string,
    scheduleId: string,
  ): Promise<ScheduleResponse> {
    const row = await this.prisma.schedule.findFirst({
      where: { id: scheduleId, ownerId },
      select: SCHEDULE_SELECT,
    });
    if (!row) {
      throw new NotFoundException('일정을 찾을 수 없습니다');
    }
    return assertChatRoom(row);
  }

  async create(
    ownerId: string,
    dto: CreateScheduleDto,
  ): Promise<ScheduleResponse> {
    if (dto.friendUserId === ownerId) {
      throw new BadRequestException('본인과의 일정은 만들 수 없습니다');
    }

    const friendship = await this.prisma.friendship.findUnique({
      where: {
        ownerId_friendUserId: {
          ownerId,
          friendUserId: dto.friendUserId,
        },
      },
    });
    if (!friendship) {
      throw new BadRequestException('친구 목록에 없는 유저입니다');
    }

    const created = await this.prisma.schedule.create({
      data: {
        ownerId,
        friendUserId: dto.friendUserId,
        meetDate: new Date(dto.meetDate),
        description: dto.description,
        chatRoom: { create: {} },
      },
      select: SCHEDULE_SELECT,
    });

    return assertChatRoom(created);
  }
}
