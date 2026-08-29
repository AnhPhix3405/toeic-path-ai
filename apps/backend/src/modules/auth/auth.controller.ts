import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AuthService, type SafeUser, type TokenResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiCreatedResponse({ description: 'Student account created' })
  register(@Body() dto: RegisterDto): Promise<SafeUser> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Authentication tokens issued' })
  login(@Body() dto: LoginDto, @Req() request: Request): Promise<TokenResponse> {
    return this.authService.login(dto, this.getSessionMetadata(request));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Authentication tokens rotated' })
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request): Promise<TokenResponse> {
    return this.authService.refresh(dto.refreshToken, this.getSessionMetadata(request));
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

  private getSessionMetadata(request: Request) {
    return {
      userAgent: request.get('user-agent'),
      ipAddress: request.ip,
    };
  }
}
