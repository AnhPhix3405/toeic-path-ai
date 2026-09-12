import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiPayloadTooLargeResponse,
  ApiUnsupportedMediaTypeResponse,
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
@ApiForbiddenResponse({
  description: 'Only active Students, Teachers, and Administrators may use this endpoint',
})
@ApiInternalServerErrorResponse({ description: 'Required profile data is unavailable' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
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

  @Post('me/avatar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Upload or replace the authenticated user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['avatar'],
      properties: { avatar: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiBadRequestResponse({
    description: 'The avatar is absent, empty, invalid, or has invalid dimensions',
  })
  @ApiUnsupportedMediaTypeResponse({ description: 'The avatar is not JPEG, PNG, or WebP' })
  @ApiPayloadTooLargeResponse({ description: 'The avatar exceeds the configured size limit' })
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: Number(process.env.AVATAR_MAX_SIZE_BYTES ?? 2_097_152), files: 1 },
    }),
  )
  uploadMyAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ProfileResponseDto> {
    return this.profileService.uploadMyAvatar(user.id, file);
  }

  @Delete('me/avatar')
  @ApiOperation({ summary: 'Delete the authenticated user avatar' })
  @ApiOkResponse({ type: ProfileResponseDto })
  deleteMyAvatar(@CurrentUser() user: AuthenticatedUser): Promise<ProfileResponseDto> {
    return this.profileService.deleteMyAvatar(user.id);
  }
}
