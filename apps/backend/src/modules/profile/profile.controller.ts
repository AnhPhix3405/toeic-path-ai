import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('Profile')
@ApiBearerAuth('JWT-auth')
@ApiUnauthorizedResponse({ description: 'Access token or session is invalid or absent' })
@ApiForbiddenResponse({ description: 'Only active Students and Teachers may use this endpoint' })
@ApiInternalServerErrorResponse({ description: 'Required profile data is unavailable' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT, UserRole.TEACHER)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiOkResponse({ type: ProfileResponseDto })
  getMyProfile(@CurrentUser() user: AuthenticatedUser): Promise<ProfileResponseDto> {
    return this.profileService.getMyProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Partially update the authenticated user profile' })
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiBadRequestResponse({ description: 'The request is empty or contains invalid fields' })
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMyProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profileService.updateMyProfile(user.id, dto);
  }
}
