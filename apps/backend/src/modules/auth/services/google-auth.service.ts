import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { DataSource } from 'typeorm';
import { AuthProvider } from '../../../common/enums/auth-provider.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { UserProfile } from '../../users/entities/user-profile.entity';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { AuthService, type SessionMetadata, type TokenResponse } from '../auth.service';
import type { GoogleAuthDto } from '../dto/request/google-auth.dto';

export interface GooglePayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified: boolean;
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly googleClient: OAuth2Client;
  private readonly googleClientId: string;
  private readonly termsVersion: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {
    this.googleClientId = this.configService.getOrThrow<string>('app.googleClientId');
    this.termsVersion = this.configService.getOrThrow<string>('app.termsVersion');
    this.googleClient = new OAuth2Client(this.googleClientId);
  }

  async verifyGoogleToken(idToken: string): Promise<GooglePayload> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.googleClientId,
      });
      const payload = ticket.getPayload();

      if (!payload || !payload.sub || !payload.email) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      if (payload.email_verified !== true) {
        throw new UnauthorizedException('Google email is not verified');
      }

      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        emailVerified: payload.email_verified,
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(`Failed to verify Google token: ${(error as Error)?.message}`);
      throw new UnauthorizedException('Invalid or expired Google token');
    }
  }

  async authenticateGoogle(
    dto: GoogleAuthDto,
    metadata: SessionMetadata = {},
  ): Promise<TokenResponse> {
    const startedAt = Date.now();
    const payload = await this.verifyGoogleToken(dto.idToken);
    const email = this.normalizeEmail(payload.email);

    // 1. Check if user with (authProvider = 'google', providerId = sub) exists
    let user = await this.usersService.findByProvider(AuthProvider.GOOGLE, payload.sub);

    if (user) {
      if (user.status === UserStatus.LOCKED) {
        throw new ForbiddenException('Account is locked');
      }
      return this.authService.issueSessionForUser(user, metadata, startedAt);
    }

    // 2. If not found by provider, check if email exists in database
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(
        'Email is already registered with another provider. Please sign in with your email and password.',
      );
    }

    // 3. User does not exist -> Create User and UserProfile in transaction
    try {
      user = await this.dataSource.transaction(async (manager) => {
        const usersRepo = manager.getRepository(User);
        const profilesRepo = manager.getRepository(UserProfile);

        const newUser = await usersRepo.save(
          usersRepo.create({
            email,
            passwordHash: null,
            role: UserRole.STUDENT,
            status: UserStatus.ACTIVE,
            authProvider: AuthProvider.GOOGLE,
            providerId: payload.sub,
            emailVerifiedAt: new Date(),
            termsAcceptedAt: new Date(),
            termsVersion: this.termsVersion,
          }),
        );

        await profilesRepo.save(
          profilesRepo.create({
            userId: newUser.id,
            fullName: payload.name?.trim() || 'Google User',
            avatarUrl: null,
          }),
        );

        return newUser;
      });
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Email or account already registered');
      }
      this.logger.error('Failed to create user during Google authentication', error);
      throw error;
    }

    return this.authService.issueSessionForUser(user, metadata, startedAt);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }
}
