import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AuthService, type TokenResponse } from './auth.service';
import {
  getRefreshCookieClearOptions,
  getRefreshCookieOptions,
} from './config/refresh-cookie.config';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { MessageResponse } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };
type LoginResponse = Omit<TokenResponse, 'refreshToken'>;
type RefreshResponse = Pick<TokenResponse, 'accessToken' | 'accessTokenExpiresIn'>;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly refreshCookieName: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.refreshCookieName = configService.getOrThrow<string>('refreshCookie.name');
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register a Student account and basic profile',
    description:
      'Public registration always creates an active Student. Role and status are not accepted from clients.',
  })
  @ApiCreatedResponse({
    description: 'Student account and profile created',
    type: RegisterResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid registration input or terms not accepted' })
  @ApiConflictResponse({ description: 'Email is already registered' })
  register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset instructions' })
  @ApiOkResponse({
    description: 'Generic response returned whether or not the email is registered',
    schema: {
      example: { message: 'If the email is registered, reset instructions will be sent.' },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid request input' })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponse> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a password with a single-use, expiring token' })
  @ApiOkResponse({
    description: 'Password reset and all login sessions revoked',
    schema: { example: { message: 'Password has been reset successfully. Please sign in again.' } },
  })
  @ApiBadRequestResponse({ description: 'The reset token is invalid, expired, revoked, or used' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MessageResponse> {
    const result = await this.authService.resetPassword(dto);
    this.clearRefreshCookie(response);
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Access token returned and refresh token set as HTTP-only cookie',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiForbiddenResponse({ description: 'Account is locked' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const { refreshToken, ...body } = await this.authService.login(
      dto,
      this.getSessionMetadata(request),
    );
    this.setRefreshCookie(response, refreshToken);
    return body;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('toeic_refresh_token')
  @ApiOkResponse({
    description: 'Access token returned and refresh cookie rotated',
  })
  @ApiUnauthorizedResponse({ description: 'Refresh cookie is invalid or absent' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RefreshResponse> {
    try {
      const refreshToken = this.getRefreshTokenFromRequest(request);
      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token cookie is required');
      }

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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('toeic_refresh_token')
  @ApiNoContentResponse({ description: 'Session revoked and cookie cleared' })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid or absent' })
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    try {
      await this.authService.revoke(request.user);
    } finally {
      this.clearRefreshCookie(response);
    }
  }

  @Post('revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async revoke(@Req() request: AuthenticatedRequest): Promise<void> {
    await this.authService.revoke(request.user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOkResponse({ description: 'Authenticated access-token identity' })
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

  private getSessionMetadata(request: Request) {
    return {
      userAgent: request.get('user-agent'),
      ipAddress: request.ip,
    };
  }
}
