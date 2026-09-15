import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import type { SecurityRequest } from '../security-events/request-context.middleware';

@Catch(HttpException) // Bắt các lỗi thuộc class HttpException
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<SecurityRequest>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const structured =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as Record<string, unknown>)
        : undefined;
    if (structured?.code === 'RATE_LIMIT_EXCEEDED') {
      response.status(status).json({
        code: structured.code,
        message: structured.message,
        details: null,
        timestamp: new Date().toISOString(),
        traceId: request.traceId ?? null,
      });
      return;
    }
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      traceId: request.traceId ?? null,
      message:
        typeof exceptionResponse === 'object' && 'message' in exceptionResponse
          ? exceptionResponse['message']
          : exception,
    });
  }
}
