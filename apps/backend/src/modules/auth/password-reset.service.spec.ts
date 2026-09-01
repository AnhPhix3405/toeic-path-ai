import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import type { DataSource, Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import type { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { AuthSession } from './entities/auth-session.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';

describe('AuthService password reset', () => {
  const user = {
    id: '8d164f76-6d3d-48b8-9de8-aa1e718d45ca',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
  } as User;
  let usersService: { findByEmail: jest.Mock };
  let mailService: jest.Mocked<MailService>;
  let sendPasswordResetEmail: jest.MockedFunction<MailService['sendPasswordResetEmail']>;
  let dataSource: { transaction: jest.Mock; getRepository: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    usersService = { findByEmail: jest.fn() };
    sendPasswordResetEmail = jest.fn().mockResolvedValue(undefined);
    mailService = { sendPasswordResetEmail };
    dataSource = { transaction: jest.fn(), getRepository: jest.fn() };
    const values: Record<string, unknown> = {
      'jwt.privateKey': 'private',
      'jwt.publicKey': 'public',
      'jwt.accessExpiresIn': '15m',
      'jwt.refreshExpiresIn': '7d',
      'jwt.accessExpiresInSeconds': 900,
      'jwt.refreshExpiresInSeconds': 604800,
      'app.termsVersion': '2026-08-31',
      'passwordReset.tokenTtlMinutes': 30,
      'passwordReset.url': 'http://localhost:3000/reset-password',
    };
    service = new AuthService(
      usersService as unknown as UsersService,
      {} as JwtService,
      { getOrThrow: (key: string) => values[key] } as ConfigService,
      dataSource as unknown as DataSource,
      {} as Repository<AuthSession>,
      {
        sendPasswordResetEmail: (input) => mailService.sendPasswordResetEmail(input),
      },
    );
  });

  it('normalizes email and returns the same response when the user does not exist', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(service.forgotPassword({ email: ' Student@Example.com ' })).resolves.toEqual({
      message: 'If the email is registered, reset instructions will be sent.',
    });
    expect(usersService.findByEmail).toHaveBeenCalledWith('student@example.com');
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('stores only a token hash, revokes old tokens, and mails the raw token URL', async () => {
    usersService.findByEmail.mockResolvedValue(user);
    const updateBuilder = createUpdateBuilder();
    const tokenRepository = {
      createQueryBuilder: jest.fn(() => updateBuilder),
      create: jest.fn((value: object) => value),
      save: jest.fn((value: object) => Promise.resolve({ ...value, id: 'reset-id' })),
    };
    dataSource.transaction.mockImplementation((work: (manager: object) => unknown) =>
      work({ query: jest.fn().mockResolvedValue(undefined), getRepository: () => tokenRepository }),
    );

    await service.forgotPassword({ email: user.email });

    const stored = tokenRepository.create.mock.calls[0][0] as {
      tokenHash: string;
      expiresAt: Date;
    };
    const mail = sendPasswordResetEmail.mock.calls[0][0];
    const rawToken = new URL(mail.resetUrl).searchParams.get('token');
    expect(rawToken).toBeTruthy();
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(mail.resetUrl).not.toContain(stored.tokenHash);
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 60_000);
    expect(updateBuilder.execute).toHaveBeenCalled();
  });

  it('changes the password and revokes reset tokens and sessions atomically', async () => {
    const now = Date.now();
    const resetToken = {
      id: 'reset-id',
      userId: user.id,
      user,
      usedAt: null,
      revokedAt: null,
      expiresAt: new Date(now + 60_000),
    } as PasswordResetToken;
    const lookupBuilder = {
      setLock: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(resetToken),
    };
    const tokenUpdateBuilder = createUpdateBuilder();
    const sessionUpdateBuilder = createUpdateBuilder();
    const tokenRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(lookupBuilder)
        .mockReturnValueOnce(tokenUpdateBuilder),
      save: jest.fn().mockResolvedValue(resetToken),
    };
    const userRepository = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
    const sessionRepository = { createQueryBuilder: jest.fn(() => sessionUpdateBuilder) };
    dataSource.transaction.mockImplementation((work: (manager: object) => unknown) =>
      work({
        getRepository: (entity: unknown) =>
          entity === PasswordResetToken
            ? tokenRepository
            : entity === User
              ? userRepository
              : sessionRepository,
      }),
    );

    await service.resetPassword({
      token: 'raw-token',
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    });

    expect(resetToken.usedAt).toBeInstanceOf(Date);
    expect(tokenUpdateBuilder.execute).toHaveBeenCalled();
    expect(sessionUpdateBuilder.execute).toHaveBeenCalled();
    const updateArguments = userRepository.update.mock.calls[0] as unknown as [
      string,
      { passwordHash: string },
    ];
    const passwordHash = updateArguments[1].passwordHash;
    await expect(compare('NewPassword123!', passwordHash)).resolves.toBe(true);
  });

  it('returns the common error for an unknown token', async () => {
    const lookupBuilder = {
      setLock: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    dataSource.transaction.mockImplementation((work: (manager: object) => unknown) =>
      work({ getRepository: () => ({ createQueryBuilder: () => lookupBuilder }) }),
    );

    await expect(
      service.resetPassword({
        token: 'invalid',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      }),
    ).rejects.toEqual(
      new BadRequestException('The password reset link is invalid or has expired.'),
    );
  });
});

function createUpdateBuilder() {
  return {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };
}
