import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { FriendSummary } from './dto/friend-summary.response';

const FRIEND_SELECT = {
  id: true,
  name: true,
  personality: true,
} as const;

@Injectable()
export class FriendshipService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(ownerId: string): Promise<FriendSummary[]> {
    const rows = await this.prisma.friendship.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: { friendUser: { select: FRIEND_SELECT } },
    });
    return rows.map((row) => row.friendUser);
  }

  async addByFriendCode(
    ownerId: string,
    friendCode: string,
  ): Promise<FriendSummary> {
    const friend = await this.prisma.user.findUnique({
      where: { friendCode },
      select: FRIEND_SELECT,
    });
    if (!friend) {
      throw new NotFoundException('해당 친구 코드를 찾을 수 없습니다');
    }
    if (friend.id === ownerId) {
      throw new BadRequestException('본인 코드는 사용할 수 없습니다');
    }

    try {
      await this.prisma.friendship.create({
        data: { ownerId, friendUserId: friend.id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('이미 추가된 친구입니다');
      }
      throw error;
    }

    return friend;
  }
}
