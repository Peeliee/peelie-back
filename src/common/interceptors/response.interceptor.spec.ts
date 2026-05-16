import {
  type CallHandler,
  type ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';

import { ResponseInterceptor } from './response.interceptor';

function createContext(statusCode: number): ExecutionContext {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

describe('ResponseInterceptor', () => {
  it('wraps successful non-204 responses', async () => {
    const interceptor = new ResponseInterceptor<string>();
    const next: CallHandler<string> = { handle: () => of('ok') };

    await expect(
      lastValueFrom(interceptor.intercept(createContext(HttpStatus.OK), next)),
    ).resolves.toEqual({
      status: HttpStatus.OK,
      success: true,
      message: 'OK',
      data: 'ok',
    });
  });

  it('leaves 204 responses empty', async () => {
    const interceptor = new ResponseInterceptor<void>();
    const next: CallHandler<void> = { handle: () => of(undefined) };

    await expect(
      lastValueFrom(
        interceptor.intercept(createContext(HttpStatus.NO_CONTENT), next),
      ),
    ).resolves.toBeUndefined();
  });
});
