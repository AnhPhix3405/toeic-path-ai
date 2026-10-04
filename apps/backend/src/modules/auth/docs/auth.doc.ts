import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RegisterResponseDto } from '../dto/response/register-response.dto';

export function ApiAuthControllerDoc(): ClassDecorator {
  return applyDecorators(
    ApiTooManyRequestsResponse({
      description: 'Rate limit exceeded. Retry-After indicates when to retry.',
    }),
  );
}

export function ApiRegisterDoc(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Register a Student account and basic profile',
      description:
        'Public registration always creates an active Student. Role and status are not accepted from clients.',
    }),
    ApiCreatedResponse({
      description: 'Student account and profile created',
      type: RegisterResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Invalid registration input or terms not accepted' }),
    ApiConflictResponse({ description: 'Email is already registered' }),
  );
}

export function ApiForgotPasswordDoc(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Request password reset instructions' }),
    ApiOkResponse({
      description: 'Generic response returned whether or not the email is registered',
      schema: {
        example: { message: 'If the email is registered, reset instructions will be sent.' },
      },
    }),
    ApiBadRequestResponse({ description: 'Invalid request input' }),
  );
}

export function ApiResetPasswordDoc(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Reset a password with a single-use, expiring token' }),
    ApiOkResponse({
      description: 'Password reset and all login sessions revoked',
      schema: { example: { message: 'Password has been reset successfully. Please sign in again.' } },
    }),
    ApiBadRequestResponse({ description: 'The reset token is invalid, expired, revoked, or used' }),
  );
}

export function ApiLoginDoc(): MethodDecorator {
  return applyDecorators(
    ApiOkResponse({
      description: 'Access token returned and refresh token set as HTTP-only cookie',
    }),
    ApiUnauthorizedResponse({ description: 'Invalid email or password' }),
    ApiForbiddenResponse({ description: 'Account is locked' }),
  );
}

export function ApiGoogleAuthDoc(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Sign in or sign up using Google ID token',
      description:
        'Verifies Google token, creates student account if new, and issues session tokens.',
    }),
    ApiOkResponse({
      description: 'Access token returned and refresh token set as HTTP-only cookie',
    }),
    ApiBadRequestResponse({ description: 'Invalid Google token or unverified email' }),
    ApiUnauthorizedResponse({ description: 'Invalid or expired Google token' }),
    ApiConflictResponse({ description: 'Email is registered with another provider' }),
    ApiForbiddenResponse({ description: 'Account is locked' }),
  );
}

export function ApiRefreshDoc(): MethodDecorator {
  return applyDecorators(
    ApiCookieAuth('toeic_refresh_token'),
    ApiOkResponse({
      description: 'Access token returned and refresh cookie rotated',
    }),
    ApiUnauthorizedResponse({ description: 'Refresh cookie is invalid or absent' }),
  );
}

export function ApiLogoutDoc(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiCookieAuth('toeic_refresh_token'),
    ApiNoContentResponse({ description: 'Session revoked and cookie cleared' }),
    ApiUnauthorizedResponse({ description: 'Access token is invalid or absent' }),
  );
}

export function ApiMeDoc(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOkResponse({ description: 'Authenticated access-token identity' }),
  );
}
