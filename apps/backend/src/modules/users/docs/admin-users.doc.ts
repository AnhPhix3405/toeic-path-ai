import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ApiAuthDoc } from '../../../common/decorators/swagger';

export function ApiAdminUsersControllerDoc(): ClassDecorator {
  return applyDecorators(
    ApiAuthDoc({
      forbiddenDescription: 'Authenticated user is not an administrator',
    }),
    ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' }),
  );
}

export function ApiFindAllUsersDoc(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'List users' }),
    ApiOkResponse({ description: 'Paginated user list without sensitive fields' }),
    ApiBadRequestResponse({ description: 'Invalid query parameters' }),
  );
}

export function ApiFindOneUserDoc(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Get a user' }),
    ApiOkResponse({ description: 'User details without sensitive fields' }),
    ApiNotFoundResponse({ description: 'User not found' }),
  );
}

export function ApiUpdateUserRoleDoc(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Change a user role and revoke active sessions' }),
    ApiOkResponse({ description: 'Role changed' }),
    ApiBadRequestResponse({ description: 'Invalid role or user id' }),
    ApiNotFoundResponse({ description: 'User not found' }),
    ApiConflictResponse({ description: 'Self-change or last-administrator protection' }),
  );
}

export function ApiUpdateUserStatusDoc(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Lock or unlock a user account' }),
    ApiOkResponse({ description: 'Account status changed' }),
    ApiBadRequestResponse({ description: 'Invalid status or user id' }),
    ApiNotFoundResponse({ description: 'User not found' }),
    ApiConflictResponse({ description: 'Administrators cannot lock themselves' }),
  );
}
