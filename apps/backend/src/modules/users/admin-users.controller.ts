import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueryUsersDto } from './dto/request/query-users.dto';
import { UpdateUserRoleDto } from './dto/request/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/request/update-user-status.dto';
import { UsersService, type PaginatedUsers, type SafeUser } from './users.service';
import type { SecurityRequest } from '../../common/security-events/request-context.middleware';

@ApiTags('Admin Users')
@ApiBearerAuth('JWT-auth')
@ApiUnauthorizedResponse({ description: 'Access token is invalid or absent' })
@ApiForbiddenResponse({ description: 'Authenticated user is not an administrator' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users' })
  @ApiOkResponse({ description: 'Paginated user list without sensitive fields' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findAll(@Query() query: QueryUsersDto): Promise<PaginatedUsers> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user' })
  @ApiOkResponse({ description: 'User details without sensitive fields' })
  @ApiNotFoundResponse({ description: 'User not found' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<SafeUser> {
    return this.usersService.findOneForAdmin(id);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Change a user role and revoke active sessions' })
  @ApiOkResponse({ description: 'Role changed' })
  @ApiBadRequestResponse({ description: 'Invalid role or user id' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'Self-change or last-administrator protection' })
  updateRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser('id') actorId: string,
    @Req() request: SecurityRequest,
  ): Promise<SafeUser> {
    return this.usersService.updateRole(id, dto.role, actorId, this.requestMetadata(request));
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Lock or unlock a user account' })
  @ApiOkResponse({ description: 'Account status changed' })
  @ApiBadRequestResponse({ description: 'Invalid status or user id' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'Administrators cannot lock themselves' })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('id') actorId: string,
    @Req() request: SecurityRequest,
  ): Promise<SafeUser> {
    return this.usersService.updateStatus(id, dto.status, actorId, this.requestMetadata(request));
  }

  private requestMetadata(request: SecurityRequest) {
    return {
      traceId: request.traceId,
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    };
  }
}
