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
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PolicyThrottlerGuard } from '../../common/rate-limit/guards/policy-throttler.guard';
import { ThrottlePolicy } from '../../common/rate-limit/decorators/throttle-policy.decorator';
import { UploadRateLimit } from '../../common/rate-limit/decorators/upload-rate-limit.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileResponseDto } from './dto/response/profile-response.dto';
import { UpdateMyProfileDto } from './dto/request/update-my-profile.dto';
import { ProfileService } from './profile.service';
import {
  ApiDeleteMyAvatarDoc,
  ApiGetMyProfileDoc,
  ApiProfileControllerDoc,
  ApiUpdateMyProfileDoc,
  ApiUploadMyAvatarDoc,
} from './docs/profile.doc';

@ApiTags('Profile')
@ApiProfileControllerDoc()
@UseGuards(JwtAuthGuard, RolesGuard, PolicyThrottlerGuard)
@Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
@ThrottlePolicy('profileManage')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @ApiGetMyProfileDoc()
  getMyProfile(@CurrentUser() user: AuthenticatedUser): Promise<ProfileResponseDto> {
    return this.profileService.getMyProfile(user.id);
  }

  @Patch('me')
  @ApiUpdateMyProfileDoc()
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMyProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profileService.updateMyProfile(user.id, dto);
  }

  @Post('me/avatar')
  @HttpCode(200)
  @UploadRateLimit('uploadAvatar')
  @ApiUploadMyAvatarDoc()
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
  @ApiDeleteMyAvatarDoc()
  deleteMyAvatar(@CurrentUser() user: AuthenticatedUser): Promise<ProfileResponseDto> {
    return this.profileService.deleteMyAvatar(user.id);
  }
}

