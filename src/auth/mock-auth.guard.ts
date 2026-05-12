import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { PersonalityType } from '@prisma/client';
import type { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './auth-user';

const MOCK_EMAIL = 'mock@peelie.dev';
const MOCK_NAME = '목유저';
const MOCK_FRIEND_CODE = 'mockcode';

@Injectable()
export class MockAuthGuard implements CanActivate, OnModuleInit {
  private mockUser: AuthUser | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: { email: MOCK_EMAIL },
    });

    if (existing) {
      this.mockUser = { id: existing.id, name: existing.name };
      return;
    }

    const created = await this.prisma.user.create({
      data: {
        email: MOCK_EMAIL,
        name: MOCK_NAME,
        personality: PersonalityType.PERSONA_A,
        friendCode: MOCK_FRIEND_CODE,
        avatar: { create: {} },
      },
    });

    this.mockUser = { id: created.id, name: created.name };
  }

  canActivate(context: ExecutionContext): boolean {
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
