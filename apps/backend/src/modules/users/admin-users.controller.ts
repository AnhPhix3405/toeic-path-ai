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
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PolicyThrottlerGuard } from '../../common/rate-limit/guards/policy-throttler.guard';
import { ThrottlePolicy } from '../../common/rate-limit/decorators/throttle-policy.decorator';
import { QueryUsersDto } from './dto/request/query-users.dto';
import { UpdateUserRoleDto } from './dto/request/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/request/update-user-status.dto';
import { UsersService, type PaginatedUsers, type SafeUser } from './users.service';
import type { SecurityRequest } from '../../common/security-events/request-context.middleware';
import {
  ApiAdminUsersControllerDoc,
  ApiFindAllUsersDoc,
  ApiFindOneUserDoc,
  ApiUpdateUserRoleDoc,
  ApiUpdateUserStatusDoc,
} from './docs/admin-users.doc';

@ApiTags('Admin Users')
@ApiAdminUsersControllerDoc()
@UseGuards(JwtAuthGuard, RolesGuard, PolicyThrottlerGuard)
@Roles(UserRole.ADMIN)
@ThrottlePolicy('adminUsers')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiFindAllUsersDoc()
  findAll(@Query() query: QueryUsersDto): Promise<PaginatedUsers> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiFindOneUserDoc()
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<SafeUser> {
    return this.usersService.findOneForAdmin(id);
  }

  @Patch(':id/role')
  @ApiUpdateUserRoleDoc()
  updateRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser('id') actorId: string,
    @Req() request: SecurityRequest,
  ): Promise<SafeUser> {
    return this.usersService.updateRole(id, dto.role, actorId, this.requestMetadata(request));
  }

  @Patch(':id/status')
  @ApiUpdateUserStatusDoc()
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
