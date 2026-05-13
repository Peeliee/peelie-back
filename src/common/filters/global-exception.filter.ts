import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import type { ApiErrorResponse } from '../dto/api-response';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // SSE 등 이미 응답이 시작된 경우 wrap 못 함. 그대로 둠.
    if (response.headersSent) return;

    const normalized = this.normalize(exception);

    response.status(normalized.status).json({
      status: normalized.status,
      success: false,
      message: normalized.message,
      code: normalized.code,
      reason: normalized.reason,
    } satisfies ApiErrorResponse);
  }

  private normalize(exception: unknown): {
    status: number;
    message: string;
    code: string;
    reason: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      let message: string;
      let reason: string;
      if (typeof res === 'object' && res !== null) {
        const r = res as { message?: string | string[] };
        if (Array.isArray(r.message)) {
          message = r.message[0] ?? exception.message;
          reason = r.message.join('; ');
        } else if (typeof r.message === 'string') {
          message = r.message;
          reason = r.message;
        } else {
          message = exception.message;
          reason = exception.message;
        }
      } else {
        message = String(res);
        reason = message;
      }

      const code = (HttpStatus[status] as string | undefined) ?? 'ERROR';
      return { status, message, code, reason };
    }

    this.logger.error('Unhandled exception', exception);
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      reason: exception instanceof Error ? exception.message : 'unknown',
    };
  }
}
