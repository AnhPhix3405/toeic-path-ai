import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export interface ApiAuthDocOptions {
  summaryRoles?: string;
  unauthorizedDescription?: string;
  forbiddenDescription?: string;
}

/**
 * Standard Swagger decorator for JWT-authenticated endpoints.
 * Applies @ApiBearerAuth('JWT-auth'), @ApiUnauthorizedResponse, and @ApiForbiddenResponse.
 */
export function ApiAuthDoc(
  options?: ApiAuthDocOptions,
): MethodDecorator & ClassDecorator {
  const unauthorizedDesc =
    options?.unauthorizedDescription ?? 'Access token is invalid or absent';
  const forbiddenDesc =
    options?.forbiddenDescription ??
    (options?.summaryRoles
      ? `Authenticated user does not have required role (${options.summaryRoles})`
      : 'Authenticated user does not have permission to access this resource');

  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiUnauthorizedResponse({ description: unauthorizedDesc }),
    ApiForbiddenResponse({ description: forbiddenDesc }),
  );
}
