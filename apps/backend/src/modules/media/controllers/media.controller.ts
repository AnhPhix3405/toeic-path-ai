import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UploadThrottlerGuard } from '../../../common/rate-limit/guards/upload-throttler.guard';
import { UploadRateLimit } from '../../../common/rate-limit/decorators/upload-rate-limit.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ApiConfirmUploadDoc,
  ApiCreateBatchPresignedUrlsDoc,
  ApiCreatePresignedUrlDoc,
  ApiDeleteMediaDoc,
  ApiGetMediaByIdDoc,
  ApiGetMediaByQuestionGroupIdDoc,
  ApiGetMediaByQuestionIdDoc,
  ApiMediaControllerDoc,
  ApiUpdateMediaTargetDoc,
} from '../docs/media.doc';
import { BatchPresignedUrlDto } from '../dto/request/batch-presigned-url.dto';
import { ConfirmMediaUploadDto } from '../dto/request/confirm-media-upload.dto';
import { CreatePresignedUrlDto } from '../dto/request/create-presigned-url.dto';
import { UpdateMediaTargetDto } from '../dto/request/update-media-target.dto';
import { MediaResourceResponseDto } from '../dto/response/media-resource-response.dto';
import {
  BatchPresignedUrlResponseDto,
  PresignedUrlResponseDto,
} from '../dto/response/presigned-url-response.dto';
import { MediaService } from '../services/media.service';

@ApiTags('Media Resources')
@ApiMediaControllerDoc()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('presigned-url')
  @UseGuards(UploadThrottlerGuard)
  @UploadRateLimit('uploadPresignedUrl')
  @ApiCreatePresignedUrlDoc()
  async createPresignedUrl(
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePresignedUrlDto,
  ): Promise<PresignedUrlResponseDto> {
    return this.mediaService.createPresignedUrl(user.id, dto);
  }

  @Post('presigned-url/batch')
  @UseGuards(UploadThrottlerGuard)
  @UploadRateLimit('uploadBatchPresignedUrl')
  @ApiCreateBatchPresignedUrlsDoc()
  async createBatchPresignedUrls(
    @CurrentUser() user: { id: string },
    @Body() dto: BatchPresignedUrlDto,
  ): Promise<BatchPresignedUrlResponseDto> {
    return this.mediaService.createBatchPresignedUrls(user.id, dto);
  }

  @Post('confirm')
  @UseGuards(UploadThrottlerGuard)
  @UploadRateLimit('uploadConfirm')
  @ApiConfirmUploadDoc()
  async confirmUpload(
    @CurrentUser() user: { id: string },
    @Body() dto: ConfirmMediaUploadDto,
  ): Promise<MediaResourceResponseDto> {
    return this.mediaService.confirmUpload(user.id, dto);
  }


  @Get(':id')
  @ApiGetMediaByIdDoc()
  async getMediaById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MediaResourceResponseDto> {
    return this.mediaService.getMediaById(id);
  }

  @Get('question/:questionId')
  @ApiGetMediaByQuestionIdDoc()
  async getMediaByQuestionId(
    @Param('questionId', new ParseUUIDPipe({ version: '4' })) questionId: string,
  ): Promise<MediaResourceResponseDto[]> {
    return this.mediaService.getMediaByQuestionId(questionId);
  }

  @Get('group/:groupId')
  @ApiGetMediaByQuestionGroupIdDoc()
  async getMediaByQuestionGroupId(
    @Param('groupId', new ParseUUIDPipe({ version: '4' })) groupId: string,
  ): Promise<MediaResourceResponseDto[]> {
    return this.mediaService.getMediaByQuestionGroupId(groupId);
  }

  @Patch(':id/target')
  @ApiUpdateMediaTargetDoc()
  async updateTarget(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateMediaTargetDto,
  ): Promise<MediaResourceResponseDto> {
    return this.mediaService.updateTarget(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteMediaDoc()
  async deleteMedia(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    await this.mediaService.deleteMedia(id);
  }
}
