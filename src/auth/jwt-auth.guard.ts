import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './auth-user';
import { IS_PUBLIC_KEY } from './public.decorator';

interface AccessTokenPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthUser }>();

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('access token이 필요합니다');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }

    let payload: AccessTokenPayload;
    try {
      payload = this.jwtService.verify<AccessTokenPayload>(token, { secret });
    } catch {
      throw new UnauthorizedException(
        'access token이 유효하지 않거나 만료되었습니다',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true },
    });
    if (!user) {
      throw new UnauthorizedException('해당 사용자를 찾을 수 없습니다');
    }

    request.user = { id: user.id, name: user.name };
    return true;
  }
}
