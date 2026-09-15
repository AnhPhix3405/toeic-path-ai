import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import type { SecurityRequest } from '../security-events/request-context.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<SecurityRequest>();
    const response = ctx.getResponse<Response>();

    const { method, originalUrl } = request;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const { statusCode } = response;
        const delay = Date.now() - now;

        this.logger.log(
          JSON.stringify({
            method,
            path: originalUrl,
            statusCode,
            durationMs: delay,
            traceId: request.traceId,
            userAgent,
          }),
        );
      }),
    );
  }
}
