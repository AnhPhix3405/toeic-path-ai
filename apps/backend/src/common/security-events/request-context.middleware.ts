import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export type SecurityRequest = Request & { traceId?: string };

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: SecurityRequest, response: Response, next: NextFunction): void {
    const supplied = request.get('x-request-id');
    const traceId = supplied && /^[A-Za-z0-9._:-]{1,100}$/.test(supplied) ? supplied : randomUUID();
    request.traceId = traceId;
    response.setHeader('X-Request-Id', traceId);
    next();
  }
}
