import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { KakaoOAuthClient } from './kakao-oauth.client';
import { MockAuthGuard } from './mock-auth.guard';
import { SignupTokenGuard } from './signup-token.guard';

@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    KakaoOAuthClient,
    MockAuthGuard,
    SignupTokenGuard,
    {
      provide: APP_GUARD,
      useExisting: MockAuthGuard,
    },
  ],
  exports: [AuthService, MockAuthGuard],
})
export class AuthModule {}
