import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider } from '@prisma/client';
import type { Request } from 'express';

import type { SignupContext } from './signup-context';

interface SignupTokenPayload {
  type: 'signup';
  provider: AuthProvider;
  providerUserId: string;
}

@Injectable()
export class SignupTokenGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { signupContext: SignupContext }>();

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('signup token이 필요합니다');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const secret = process.env.JWT_SIGNUP_SECRET;
    if (!secret) {
      throw new Error('JWT_SIGNUP_SECRET is not configured');
    }

    let payload: SignupTokenPayload;
    try {
      payload = this.jwtService.verify<SignupTokenPayload>(token, { secret });
    } catch {
      throw new UnauthorizedException(
        'signup token이 유효하지 않거나 만료되었습니다',
      );
    }

    if (payload.type !== 'signup') {
      throw new UnauthorizedException('signup token이 아닙니다');
    }

    request.signupContext = {
      provider: payload.provider,
      providerUserId: payload.providerUserId,
    };
    return true;
  }
}
