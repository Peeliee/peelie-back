import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { map, Observable } from 'rxjs';

import type { ApiSuccessResponse } from '../dto/api-response';

/**
 * 모든 성공 응답을 ApiSuccessResponse 로 wrap.
 * SSE 라우트(@Res 직접 사용)는 NestJS pipeline 안 거치므로 자동 skip.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data) => ({
        status: response.statusCode || HttpStatus.OK,
        success: true as const,
        message: 'OK',
        data,
      })),
    );
  }
}
