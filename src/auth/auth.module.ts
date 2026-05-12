import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { MockAuthGuard } from './mock-auth.guard';

@Global()
@Module({
  providers: [
    MockAuthGuard,
    {
      provide: APP_GUARD,
      useExisting: MockAuthGuard,
    },
  ],
  exports: [MockAuthGuard],
})
export class AuthModule {}
