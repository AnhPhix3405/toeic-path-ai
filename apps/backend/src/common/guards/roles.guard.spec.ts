import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  beforeEach(() => jest.clearAllMocks());

  it('allows authenticated endpoints without role metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(context())).toBe(true);
  });

  it.each([
    [UserRole.ADMIN, [UserRole.ADMIN]],
    [UserRole.TEACHER, [UserRole.TEACHER]],
    [UserRole.ADMIN, [UserRole.TEACHER, UserRole.ADMIN]],
  ])('allows %s for %j', (role, requiredRoles) => {
    reflector.getAllAndOverride.mockReturnValue(requiredRoles);
    expect(guard.canActivate(context(user(role)))).toBe(true);
  });

  it.each([
    [UserRole.STUDENT, [UserRole.TEACHER]],
    [UserRole.TEACHER, [UserRole.ADMIN]],
    ['invalid', [UserRole.ADMIN]],
  ])('rejects %s for %j with 403', (role, requiredRoles) => {
    reflector.getAllAndOverride.mockReturnValue(requiredRoles);
    expect(() => guard.canActivate(context(user(role as UserRole)))).toThrow(ForbiddenException);
  });

  it('returns 401 when authenticated user is absent', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(() => guard.canActivate(context())).toThrow(UnauthorizedException);
  });

  function user(role: UserRole): AuthenticatedUser {
    return {
      id: 'user-id',
      sessionId: 'session-id',
      email: 'user@example.com',
      role,
      status: UserStatus.ACTIVE,
    };
  }

  function context(authenticatedUser?: AuthenticatedUser): ExecutionContext {
    return {
      getHandler: () => jest.fn(),
      getClass: () => class TestController {},
      switchToHttp: () => ({ getRequest: () => ({ user: authenticatedUser }) }),
    } as unknown as ExecutionContext;
  }
});
