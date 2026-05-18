import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import type { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';

const TEST_SECRET = 'test-jwt-secret';

function setup(
  opts: {
    authHeader?: string;
    isPublic?: boolean;
    user?: { id: string; name: string } | null;
  } = {},
) {
  const request: { headers: { authorization?: string }; user?: unknown } = {
    headers: opts.authHeader ? { authorization: opts.authHeader } : {},
  };

  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => null,
    getClass: () => null,
  } as unknown as ExecutionContext;

  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(opts.isPublic ?? false),
  } as unknown as Reflector;

  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(opts.user ?? null),
    },
  } as unknown as PrismaService;

  const jwtService = new JwtService({});
  const guard = new JwtAuthGuard(jwtService, prisma, reflector);

  return { context, guard, jwtService, prisma, request };
}

describe('JwtAuthGuard', () => {
  const originalSecret = process.env.JWT_ACCESS_SECRET;

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    process.env.JWT_ACCESS_SECRET = originalSecret;
  });

  it('@Public 라우트는 토큰 없이 통과', async () => {
    const { context, guard } = setup({ isPublic: true });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('Authorization 헤더 없으면 401', async () => {
    const { context, guard } = setup();
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('Bearer 가 아니면 401', async () => {
    const { context, guard } = setup({ authHeader: 'Basic abc' });
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('위변조 토큰이면 401', async () => {
    const { context, guard } = setup({ authHeader: 'Bearer not.a.jwt' });
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('유효 토큰 + DB 에 없는 user 면 401', async () => {
    const { context, guard, jwtService } = setup({ user: null });
    const token = jwtService.sign(
      { sub: 'ghost-user' },
      { secret: TEST_SECRET, expiresIn: '5m' },
    );
    context.switchToHttp().getRequest<{
      headers: { authorization?: string };
    }>().headers.authorization = `Bearer ${token}`;

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('유효 토큰 + 존재하는 user 면 req.user 박고 통과', async () => {
    const { context, guard, jwtService, request } = setup({
      user: { id: 'user-1', name: '용희' },
    });
    const token = jwtService.sign(
      { sub: 'user-1' },
      { secret: TEST_SECRET, expiresIn: '5m' },
    );
    context.switchToHttp().getRequest<{
      headers: { authorization?: string };
    }>().headers.authorization = `Bearer ${token}`;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-1', name: '용희' });
  });
});
