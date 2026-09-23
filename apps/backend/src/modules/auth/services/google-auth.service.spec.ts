import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import type { DataSource, EntityManager } from 'typeorm';
import { AuthProvider } from '../../../common/enums/auth-provider.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { UserProfile } from '../../users/entities/user-profile.entity';
import { User } from '../../users/entities/user.entity';
import type { UsersService } from '../../users/users.service';
import type { AuthService, TokenResponse } from '../auth.service';
import { GoogleAuthService } from './google-auth.service';

jest.mock('google-auth-library');

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;
  let configService: ConfigService;
  let dataSource: Pick<DataSource, 'transaction'>;
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmail' | 'findByProvider'>>;
  let authService: jest.Mocked<Pick<AuthService, 'issueSessionForUser'>>;
  let mockOAuthClient: { verifyIdToken: jest.Mock };

  const mockGoogleClientId = 'test-google-client-id.apps.googleusercontent.com';
  const mockTermsVersion = '2026-08-31';

  const mockTokenResponse: TokenResponse = {
    user: {
      id: 'mock-user-uuid',
      email: 'student@example.com',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    },
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    accessTokenExpiresIn: 900,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockOAuthClient = {
      verifyIdToken: jest.fn(),
    };
    (OAuth2Client as unknown as jest.Mock).mockImplementation(() => mockOAuthClient);

    configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'app.googleClientId') return mockGoogleClientId;
        if (key === 'app.termsVersion') return mockTermsVersion;
        throw new Error(`Unexpected key ${key}`);
      }),
    } as unknown as ConfigService;

    usersService = {
      findByEmail: jest.fn(),
      findByProvider: jest.fn(),
    };

    authService = {
      issueSessionForUser: jest.fn().mockResolvedValue(mockTokenResponse),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    service = new GoogleAuthService(
      configService,
      dataSource as unknown as DataSource,
      usersService as unknown as UsersService,
      authService as unknown as AuthService,
    );
  });

  describe('verifyGoogleToken', () => {
    it('throws UnauthorizedException when OAuth2Client.verifyIdToken fails (invalid or expired token)', async () => {
      mockOAuthClient.verifyIdToken.mockRejectedValue(new Error('Token used too late'));

      await expect(service.verifyGoogleToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyGoogleToken('expired-token')).rejects.toThrow(
        'Invalid or expired Google token',
      );
      expect(mockOAuthClient.verifyIdToken).toHaveBeenCalledWith({
        idToken: 'expired-token',
        audience: mockGoogleClientId,
      });
    });

    it('throws UnauthorizedException when email_verified is false', async () => {
      mockOAuthClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: 'google-sub-123',
          email: 'unverified@example.com',
          email_verified: false,
          name: 'Unverified User',
        }),
      });

      await expect(service.verifyGoogleToken('unverified-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyGoogleToken('unverified-token')).rejects.toThrow(
        'Google email is not verified',
      );
    });

    it('returns payload when token is valid and email is verified', async () => {
      mockOAuthClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: 'google-sub-123',
          email: 'user@example.com',
          email_verified: true,
          name: 'John Doe',
          picture: 'https://example.com/avatar.jpg',
        }),
      });

      const payload = await service.verifyGoogleToken('valid-token');
      expect(payload).toEqual({
        sub: 'google-sub-123',
        email: 'user@example.com',
        name: 'John Doe',
        picture: 'https://example.com/avatar.jpg',
        emailVerified: true,
      });
    });
  });

  describe('authenticateGoogle', () => {
    const validGooglePayload = {
      sub: 'google-sub-123',
      email: 'student@example.com',
      email_verified: true,
      name: 'John Student',
      picture: 'https://example.com/photo.jpg',
    };

    it('signs in existing Google user without creating a new user (Idempotency)', async () => {
      mockOAuthClient.verifyIdToken.mockResolvedValue({
        getPayload: () => validGooglePayload,
      });

      const existingGoogleUser = {
        id: 'existing-google-user-id',
        email: 'student@example.com',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.GOOGLE,
        providerId: 'google-sub-123',
      } as User;

      usersService.findByProvider.mockResolvedValue(existingGoogleUser);

      const result = await service.authenticateGoogle({ idToken: 'valid-id-token' });

      expect(usersService.findByProvider).toHaveBeenCalledWith(
        AuthProvider.GOOGLE,
        'google-sub-123',
      );
      expect(usersService.findByEmail).not.toHaveBeenCalled();
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(authService.issueSessionForUser).toHaveBeenCalledWith(
        existingGoogleUser,
        {},
        expect.any(Number),
      );
      expect(result).toEqual(mockTokenResponse);
    });

    it('throws ForbiddenException if existing Google user account is locked', async () => {
      mockOAuthClient.verifyIdToken.mockResolvedValue({
        getPayload: () => validGooglePayload,
      });

      const lockedGoogleUser = {
        id: 'locked-user-id',
        email: 'student@example.com',
        role: UserRole.STUDENT,
        status: UserStatus.LOCKED,
        authProvider: AuthProvider.GOOGLE,
        providerId: 'google-sub-123',
      } as User;

      usersService.findByProvider.mockResolvedValue(lockedGoogleUser);

      await expect(service.authenticateGoogle({ idToken: 'valid-id-token' })).rejects.toThrow(
        ForbiddenException,
      );
      expect(authService.issueSessionForUser).not.toHaveBeenCalled();
    });

    it('throws ConflictException if email exists under another provider (e.g. local password account)', async () => {
      mockOAuthClient.verifyIdToken.mockResolvedValue({
        getPayload: () => validGooglePayload,
      });

      usersService.findByProvider.mockResolvedValue(null);

      const existingLocalUser = {
        id: 'existing-local-user-id',
        email: 'student@example.com',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.LOCAL,
        providerId: null,
      } as User;

      usersService.findByEmail.mockResolvedValue(existingLocalUser);

      await expect(service.authenticateGoogle({ idToken: 'valid-id-token' })).rejects.toThrow(
        ConflictException,
      );
      await expect(service.authenticateGoogle({ idToken: 'valid-id-token' })).rejects.toThrow(
        'Email is already registered with another provider',
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(authService.issueSessionForUser).not.toHaveBeenCalled();
    });

    it('creates new User and UserProfile in transaction when user is new and issues session', async () => {
      mockOAuthClient.verifyIdToken.mockResolvedValue({
        getPayload: () => validGooglePayload,
      });

      usersService.findByProvider.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);

      const createdUser = {
        id: 'new-user-id',
        email: 'student@example.com',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.GOOGLE,
        providerId: 'google-sub-123',
        passwordHash: null,
        emailVerifiedAt: new Date(),
        termsAcceptedAt: new Date(),
        termsVersion: mockTermsVersion,
      } as User;

      const createdProfile = {
        id: 'new-profile-id',
        userId: 'new-user-id',
        fullName: 'John Student',
        avatarUrl: 'https://example.com/photo.jpg',
      } as UserProfile;

      const mockUsersRepo = {
        create: jest.fn((attrs: Partial<User>) => attrs as User),
        save: jest.fn().mockResolvedValue(createdUser),
      };

      const mockProfilesRepo = {
        create: jest.fn((attrs: Partial<UserProfile>) => attrs as UserProfile),
        save: jest.fn().mockResolvedValue(createdProfile),
      };

      const mockEntityManager = {
        getRepository: jest.fn((entity) => {
          if (entity === User) return mockUsersRepo;
          if (entity === UserProfile) return mockProfilesRepo;
          throw new Error('Unknown entity');
        }),
      } as unknown as EntityManager;

      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (manager: EntityManager) => Promise<unknown>) => cb(mockEntityManager),
      );

      const result = await service.authenticateGoogle(
        { idToken: 'valid-id-token' },
        { ipAddress: '127.0.0.1' },
      );

      expect(usersService.findByProvider).toHaveBeenCalledWith(
        AuthProvider.GOOGLE,
        'google-sub-123',
      );
      expect(usersService.findByEmail).toHaveBeenCalledWith('student@example.com');
      expect(dataSource.transaction).toHaveBeenCalled();

      expect(mockUsersRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'student@example.com',
          passwordHash: null,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          authProvider: AuthProvider.GOOGLE,
          providerId: 'google-sub-123',
          termsVersion: mockTermsVersion,
        }),
      );
      expect(mockProfilesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'new-user-id',
          fullName: 'John Student',
          avatarUrl: null,
        }),
      );

      expect(authService.issueSessionForUser).toHaveBeenCalledWith(
        createdUser,
        { ipAddress: '127.0.0.1' },
        expect.any(Number),
      );
      expect(result).toEqual(mockTokenResponse);
    });

    it('rolls back transaction if UserProfile creation fails', async () => {
      mockOAuthClient.verifyIdToken.mockResolvedValue({
        getPayload: () => validGooglePayload,
      });

      usersService.findByProvider.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);

      const profileError = new Error('Database disk error on UserProfile');

      (dataSource.transaction as jest.Mock).mockRejectedValue(profileError);

      await expect(service.authenticateGoogle({ idToken: 'valid-id-token' })).rejects.toThrow(
        profileError,
      );
      expect(authService.issueSessionForUser).not.toHaveBeenCalled();
    });
  });
});
