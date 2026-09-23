import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthSession } from './entities/auth-session.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { AuthSessionCleanupService } from './services/auth-session-cleanup.service';
import { GoogleAuthService } from './services/google-auth.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { MailModule } from '../mail/mail.module';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthSession, PasswordResetToken]),
    MailModule,
    PassportModule,
    JwtModule.register({}),
    UsersModule,
    RateLimitModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleAuthService,
    AuthSessionCleanupService,
    JwtAccessStrategy,
    JwtAuthGuard,
  ],
  exports: [AuthService, GoogleAuthService],
})
export class AuthModule {}
