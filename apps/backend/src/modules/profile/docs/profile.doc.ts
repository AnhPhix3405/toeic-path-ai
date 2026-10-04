import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { ProfileResponseDto } from '../dto/response/profile-response.dto';

export function ApiProfileControllerDoc(): ClassDecorator {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiUnauthorizedResponse({ description: 'Access token or session is invalid or absent' }),
    ApiForbiddenResponse({
      description: 'Only active Students, Teachers, and Administrators may use this endpoint',
    }),
    ApiInternalServerErrorResponse({ description: 'Required profile data is unavailable' }),
  );
}

export function ApiGetMyProfileDoc(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get the authenticated user profile' }),
    ApiOkResponse({ type: ProfileResponseDto }),
  );
}

export function ApiUpdateMyProfileDoc(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Partially update the authenticated user profile' }),
    ApiOkResponse({ type: ProfileResponseDto }),
    ApiBadRequestResponse({ description: 'The request is empty or contains invalid fields' }),
  );
}

export function ApiUploadMyAvatarDoc(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Upload or replace the authenticated user avatar' }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['avatar'],
        properties: { avatar: { type: 'string', format: 'binary' } },
      },
    }),
    ApiOkResponse({ type: ProfileResponseDto }),
    ApiBadRequestResponse({
      description: 'The avatar is absent, empty, invalid, or has invalid dimensions',
    }),
    ApiUnsupportedMediaTypeResponse({ description: 'The avatar is not JPEG, PNG, or WebP' }),
    ApiPayloadTooLargeResponse({ description: 'The avatar exceeds the configured size limit' }),
    ApiTooManyRequestsResponse({
      description: 'Too many avatar upload attempts. Please try again later.',
    }),
  );
}


export function ApiDeleteMyAvatarDoc(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Delete the authenticated user avatar' }),
    ApiOkResponse({ type: ProfileResponseDto }),
  );
}
