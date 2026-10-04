import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AuthService, type TokenResponse, type MessageResponse } from './auth.service';
import {
  getRefreshCookieClearOptions,
  getRefreshCookieOptions,
} from './config/refresh-cookie.config';
import { LoginDto } from './dto/request/login.dto';
import { RegisterDto } from './dto/request/register.dto';
import { RegisterResponseDto } from './dto/response/register-response.dto';
import { ForgotPasswordDto } from './dto/request/forgot-password.dto';
import { ResetPasswordDto } from './dto/request/reset-password.dto';
import { GoogleAuthDto } from './dto/request/google-auth.dto';
import { GoogleAuthService } from './services/google-auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthRateLimit } from '../../common/rate-limit/decorators/auth-rate-limit.decorator';
import { AuthThrottlerGuard } from '../../common/rate-limit/guards/auth-throttler.guard';
import { LoginFailureInterceptor } from '../../common/rate-limit/interceptors/login-failure.interceptor';
import { AuthOriginGuard } from '../../common/rate-limit/guards/auth-origin.guard';
import type { SecurityRequest } from '../../common/security-events/request-context.middleware';
import {
  ApiAuthControllerDoc,
  ApiForgotPasswordDoc,
  ApiGoogleAuthDoc,
  ApiLoginDoc,
  ApiLogoutDoc,
  ApiMeDoc,
  ApiRefreshDoc,
  ApiRegisterDoc,
  ApiResetPasswordDoc,
} from './docs/auth.doc';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };
type LoginResponse = Omit<TokenResponse, 'refreshToken'>;
type RefreshResponse = Pick<TokenResponse, 'accessToken' | 'accessTokenExpiresIn'>;

@ApiTags('auth')
@ApiAuthControllerDoc()
@Controller('auth')
export class AuthController {
  private readonly refreshCookieName: string;

  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly configService: ConfigService,
  ) {
    this.refreshCookieName = configService.getOrThrow<string>('refreshCookie.name');
  }

  @Post('register')
  @AuthRateLimit('register')
  @UseGuards(AuthThrottlerGuard)
  @ApiRegisterDoc()
  register(
    @Body() dto: RegisterDto,
    @Req() request: SecurityRequest,
  ): Promise<RegisterResponseDto> {
    return this.authService.register(dto, this.getSessionMetadata(request));
  }

  @Post('forgot-password')
  @AuthRateLimit('forgotPassword')
  @UseGuards(AuthThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiForgotPasswordDoc()
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() request: SecurityRequest,
  ): Promise<MessageResponse> {
    return this.authService.forgotPassword(dto, this.getSessionMetadata(request));
  }

  @Post('reset-password')
  @AuthRateLimit('resetPassword')
  @UseGuards(AuthThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiResetPasswordDoc()
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() request: SecurityRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MessageResponse> {
    const result = await this.authService.resetPassword(dto, this.getSessionMetadata(request));
    this.clearRefreshCookie(response);
    return result;
  }

  @Post('login')
  @AuthRateLimit('login')
  @UseGuards(AuthOriginGuard, AuthThrottlerGuard)
  @UseInterceptors(LoginFailureInterceptor)
  @HttpCode(HttpStatus.OK)
  @ApiLoginDoc()
  async login(
    @Body() dto: LoginDto,
    @Req() request: SecurityRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const { refreshToken, ...body } = await this.authService.login(
      dto,
      this.getSessionMetadata(request),
    );
    this.setRefreshCookie(response, refreshToken);
    return body;
  }

  @Post('google')
  @AuthRateLimit('login')
  @UseGuards(AuthOriginGuard, AuthThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiGoogleAuthDoc()
  async googleAuth(
    @Body() dto: GoogleAuthDto,
    @Req() request: SecurityRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const { refreshToken, ...body } = await this.googleAuthService.authenticateGoogle(
      dto,
      this.getSessionMetadata(request),
    );
    this.setRefreshCookie(response, refreshToken);
    return body;
  }

  @Post('refresh')
  @AuthRateLimit('refresh')
  @UseGuards(AuthOriginGuard, AuthThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiRefreshDoc()
  async refresh(
    @Req() request: SecurityRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RefreshResponse> {
    try {
      const refreshToken = this.getRefreshTokenFromRequest(request);
      const result = await this.authService.refresh(refreshToken, this.getSessionMetadata(request));
      this.setRefreshCookie(response, result.refreshToken);
      return {
        accessToken: result.accessToken,
        accessTokenExpiresIn: result.accessTokenExpiresIn,
      };
    } catch (error: unknown) {
      this.clearRefreshCookie(response);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthRateLimit('logout')
  @UseGuards(AuthOriginGuard, AuthThrottlerGuard, JwtAuthGuard)
  @ApiLogoutDoc()
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    try {
      await this.authService.revoke(request.user, this.getSessionMetadata(request));
    } finally {
      this.clearRefreshCookie(response);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiMeDoc()
  me(@Req() request: AuthenticatedRequest): AuthenticatedUser {
    return request.user;
  }

  private setRefreshCookie(response: Response, refreshToken: string): void {
    response.cookie(
      this.refreshCookieName,
      refreshToken,
      getRefreshCookieOptions(this.configService),
    );
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(this.refreshCookieName, getRefreshCookieClearOptions(this.configService));
  }

  private getRefreshTokenFromRequest(request: Request): string | undefined {
    const cookies = request.cookies as unknown;
    if (typeof cookies !== 'object' || cookies === null) {
      return undefined;
    }

    const token = (cookies as Record<string, unknown>)[this.refreshCookieName];
    return typeof token === 'string' && token.length > 0 ? token : undefined;
  }

  private getSessionMetadata(request: SecurityRequest) {
    return {
      userAgent: request.get('user-agent'),
      ipAddress: request.ip,
      traceId: request.traceId,
    };
  }
}
