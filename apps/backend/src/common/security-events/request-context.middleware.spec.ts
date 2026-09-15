import type { NextFunction, Response } from 'express';
import { RequestContextMiddleware, type SecurityRequest } from './request-context.middleware';

describe('RequestContextMiddleware', () => {
  const middleware = new RequestContextMiddleware();

  it('reuses a valid request id and returns it in the response', () => {
    const request = {
      get: jest.fn().mockReturnValue('trace-safe_123'),
    } as unknown as SecurityRequest;
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;
    const next = jest.fn() as NextFunction;
    middleware.use(request, response, next);
    expect(request.traceId).toBe('trace-safe_123');
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', 'trace-safe_123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('replaces an unsafe or oversized request id with a UUID', () => {
    const request = {
      get: jest.fn().mockReturnValue(`bad\n${'x'.repeat(101)}`),
    } as unknown as SecurityRequest;
    const response = { setHeader: jest.fn() } as unknown as Response;
    middleware.use(request, response, jest.fn());
    expect(request.traceId).toMatch(/^[0-9a-f-]{36}$/);
    expect(request.traceId).not.toContain('bad');
  });
});
