import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import type { AccessTokenPayload } from '../../../common/interfaces/access-token-payload.interface';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { AuthSession } from '../entities/auth-session.entity';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    configService: ConfigService,
    @InjectRepository(AuthSession)
    private readonly sessionsRepository: Repository<AuthSession>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.publicKey'),
      algorithms: ['RS256'],
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const session = await this.sessionsRepository.findOne({
      where: { id: payload.sid, userId: payload.sub },
      relations: { user: true },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException('Session is not active');
    }

    return {
      id: session.user.id,
      sessionId: payload.sid,
      email: session.user.email,
      role: session.user.role,
      status: session.user.status,
    };
  }
}
