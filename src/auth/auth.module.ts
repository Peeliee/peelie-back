import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { KakaoOAuthClient } from './kakao-oauth.client';
import { MockAuthGuard } from './mock-auth.guard';
import { SignupTokenGuard } from './signup-token.guard';

// USE_MOCK_AUTH=true 면 모든 보호된 라우트가 mock@peelie.dev 로 인증됨 (dev/test 용).
// 그 외에는 JwtAuthGuard 가 Authorization: Bearer <accessToken> 을 검증함.
const useMockAuth = process.env.USE_MOCK_AUTH === 'true';

@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    KakaoOAuthClient,
    MockAuthGuard,
    JwtAuthGuard,
    SignupTokenGuard,
    {
      provide: APP_GUARD,
      useExisting: useMockAuth ? MockAuthGuard : JwtAuthGuard,
    },
  ],
  exports: [AuthService, MockAuthGuard, JwtAuthGuard],
})
export class AuthModule {}
