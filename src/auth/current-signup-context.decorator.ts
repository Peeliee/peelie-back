import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { SignupContext } from './signup-context';

export const CurrentSignupContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SignupContext => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { signupContext: SignupContext }>();
    return request.signupContext;
  },
);
