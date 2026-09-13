import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthOriginGuard } from './auth-origin.guard';

describe('AuthOriginGuard', () => {
  const guard = new AuthOriginGuard(
    new ConfigService({ app: { authAllowedOrigins: ['http://localhost:3000'] } }),
  );

  const context = (origin?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ get: (name: string) => (name === 'origin' ? origin : undefined) }),
      }),
    }) as ExecutionContext;

  it('accepts requests without Origin and configured browser origins', () => {
    expect(guard.canActivate(context())).toBe(true);
    expect(guard.canActivate(context('http://localhost:3000'))).toBe(true);
  });

  it('rejects an untrusted Origin with a controlled 403 exception', () => {
    expect(() => guard.canActivate(context('https://attacker.example'))).toThrow(
      ForbiddenException,
    );
  });
});
