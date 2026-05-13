import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PersonalityType } from '@prisma/client';
import type { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './auth-user';
import { IS_PUBLIC_KEY } from './public.decorator';

interface MockUserSeed {
  email: string;
  name: string;
  personality: PersonalityType;
  friendCode: string;
}

// 인증된 본인 (req.user 에 박힘)
const MOCK_OWNER_EMAIL = 'mock@peelie.dev';

// 시드되는 mock 유저들. 첫 번째가 owner, 나머지는 친추 대상 / 일정 친구 후보용
const MOCK_USERS: MockUserSeed[] = [
  {
    email: MOCK_OWNER_EMAIL,
    name: '목유저',
    personality: PersonalityType.STRAIGHT_SHOOTER,
    friendCode: 'mockcode',
  },
  {
    email: 'mock2@peelie.dev',
    name: '친구목유저',
    personality: PersonalityType.QUIET_CHARMER,
    friendCode: 'mockcode2',
  },
];

@Injectable()
export class MockAuthGuard implements CanActivate, OnModuleInit {
  private mockUser: AuthUser | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const seed of MOCK_USERS) {
      await this.ensureSeeded(seed);
    }

    const owner = await this.prisma.user.findUniqueOrThrow({
      where: { email: MOCK_OWNER_EMAIL },
    });
    this.mockUser = { id: owner.id, name: owner.name };
  }

  private async ensureSeeded(seed: MockUserSeed): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: { email: seed.email },
    });
    if (existing) return;

    await this.prisma.user.create({
      data: {
        email: seed.email,
        name: seed.name,
        personality: seed.personality,
        friendCode: seed.friendCode,
        avatar: { create: {} },
      },
    });
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    if (!this.mockUser) {
      throw new ForbiddenException('Mock user is not initialized yet.');
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthUser }>();
    request.user = this.mockUser;
    return true;
  }
}
