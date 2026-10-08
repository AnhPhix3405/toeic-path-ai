import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export interface ErrorResponseDescriptions {
  badRequest?: string;
  unauthorized?: string;
  forbidden?: string;
  notFound?: string;
  conflict?: string;
  internalServerError?: string;
}

/**
 * Composite Swagger decorator for standard error response status codes.
 */
export function ApiErrorResponsesDoc(
  statuses: number[] = [400],
  descriptions?: ErrorResponseDescriptions,
): MethodDecorator {
  const decorators: MethodDecorator[] = [];

  if (statuses.includes(400)) {
    decorators.push(
      ApiBadRequestResponse({
        description: descriptions?.badRequest ?? 'Invalid request data or parameters',
      }),
    );
  }
  if (statuses.includes(401)) {
    decorators.push(
      ApiUnauthorizedResponse({
        description: descriptions?.unauthorized ?? 'Access token is invalid or absent',
      }),
    );
  }
  if (statuses.includes(403)) {
    decorators.push(
      ApiForbiddenResponse({
        description: descriptions?.forbidden ?? 'Access to this resource is forbidden',
      }),
    );
  }
  if (statuses.includes(404)) {
    decorators.push(
      ApiNotFoundResponse({
        description: descriptions?.notFound ?? 'Requested resource was not found',
      }),
    );
  }
  if (statuses.includes(409)) {
    decorators.push(
      ApiConflictResponse({
        description: descriptions?.conflict ?? 'Resource conflict or state violation',
      }),
    );
  }
  if (statuses.includes(500)) {
    decorators.push(
      ApiInternalServerErrorResponse({
        description: descriptions?.internalServerError ?? 'An unexpected server error occurred',
      }),
    );
  }

  return applyDecorators(...decorators);
}
