import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';

import { AppleOAuthClient } from '../auth/apple-oauth.client';
import { PrismaService } from '../prisma/prisma.service';
import type { MeResponse } from './dto/me.response';
import type { UpdateMeDto } from './dto/update-me.dto';

const ME_SELECT = {
  id: true,
  name: true,
  personality: true,
  friendCode: true,
  createdAt: true,
} as const;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appleClient: AppleOAuthClient,
  ) {}

  async findById(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: ME_SELECT,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<MeResponse> {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: ME_SELECT,
    });
  }

  /**
   * 회원탈뢰 (soft delete).
   * 1. Apple Account 에 refresh_token 이 있으면 Apple revoke 시도 (실패해도 무시)
   * 2. User.deletedAt = NOW() 마킹
   * 3. UNIQUE 제약 해방을 위해 User.friendCode / Account.providerUserId 에 suffix
   *    → 같은 카카오/애플 계정으로 재가입 가능, friendCode 도 신규 사용자가 받을 수 있게
   */
  async softDelete(userId: string): Promise<void> {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        providerUserId: true,
        refreshToken: true,
      },
    });

    // Apple revoke 시도. 실패는 로그만 남기고 진행.
    for (const acc of accounts) {
      if (acc.provider === AuthProvider.APPLE && acc.refreshToken) {
        try {
          await this.appleClient.revoke(acc.refreshToken);
        } catch (error) {
          this.logger.warn(
            `Apple revoke 실패 (userId=${userId}, accountId=${acc.id}): ${
              error instanceof Error ? error.message : 'unknown'
            }`,
          );
        }
      }
    }

    const suffix = `__deleted__${Date.now()}`;

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { friendCode: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          friendCode: `${user.friendCode}${suffix}`,
        },
      });

      for (const acc of accounts) {
        await tx.account.update({
          where: { id: acc.id },
          data: { providerUserId: `${acc.providerUserId}${suffix}` },
        });
      }
    });
  }
}
