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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreatePresignedUrlDto } from '../dto/request/create-presigned-url.dto';
import { BatchPresignedUrlDto } from '../dto/request/batch-presigned-url.dto';
import { ConfirmMediaUploadDto } from '../dto/request/confirm-media-upload.dto';
import { UpdateMediaTargetDto } from '../dto/request/update-media-target.dto';
import {
  BatchPresignedUrlResponseDto,
  PresignedUrlResponseDto,
} from '../dto/response/presigned-url-response.dto';
import { MediaResourceResponseDto } from '../dto/response/media-resource-response.dto';
import { MediaService } from '../services/media.service';

@ApiTags('Media Resources')
@ApiBearerAuth('JWT-auth')
@ApiUnauthorizedResponse({ description: 'Access token is invalid or absent' })
@ApiForbiddenResponse({
  description: 'Authenticated user does not have permission to manage media resources',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('presigned-url')
  @ApiOperation({
    summary: 'Request a presigned upload URL for direct media upload',
    description: 'Generates a signed upload URL to upload audio (<=15MB) or images (<=5MB) directly to Cloud Storage.',
  })
  @ApiCreatedResponse({
    description: 'Presigned upload URL successfully created',
    type: PresignedUrlResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid file quota or unsupported MIME type' })
  async createPresignedUrl(
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePresignedUrlDto,
  ): Promise<PresignedUrlResponseDto> {
    return this.mediaService.createPresignedUrl(user.id, dto);
  }

  @Post('presigned-url/batch')
  @ApiOperation({
    summary: 'Request multiple presigned upload URLs (1-10 files)',
    description: 'Generates an array of signed upload URLs for multi-file TOEIC question assets.',
  })
  @ApiCreatedResponse({
    description: 'Batch presigned upload URLs successfully created',
    type: BatchPresignedUrlResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid file list or batch size exceeded' })
  async createBatchPresignedUrls(
    @CurrentUser() user: { id: string },
    @Body() dto: BatchPresignedUrlDto,
  ): Promise<BatchPresignedUrlResponseDto> {
    return this.mediaService.createBatchPresignedUrls(user.id, dto);
  }

  @Post('confirm')
  @ApiOperation({
    summary: 'Confirm direct upload and create media resource record',
    description: 'Verifies file existence on Cloud Storage and saves metadata to media_resources table.',
  })
  @ApiCreatedResponse({
    description: 'Media resource verified and registered successfully',
    type: MediaResourceResponseDto,
  })
  @ApiBadRequestResponse({ description: 'File not found on storage, quota exceeded, or invalid target' })
  async confirmUpload(
    @CurrentUser() user: { id: string },
    @Body() dto: ConfirmMediaUploadDto,
  ): Promise<MediaResourceResponseDto> {
    return this.mediaService.confirmUpload(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media resource details by ID' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Media Resource UUID' })
  @ApiOkResponse({
    description: 'Media resource details returned',
    type: MediaResourceResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Media resource not found' })
  async getMediaById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MediaResourceResponseDto> {
    return this.mediaService.getMediaById(id);
  }

  @Get('question/:questionId')
  @ApiOperation({ summary: 'Get active media resources associated with a question' })
  @ApiParam({ name: 'questionId', format: 'uuid', description: 'Question UUID' })
  @ApiOkResponse({
    description: 'List of media resources for the question',
    type: [MediaResourceResponseDto],
  })
  @ApiNotFoundResponse({ description: 'Question not found' })
  async getMediaByQuestionId(
    @Param('questionId', new ParseUUIDPipe({ version: '4' })) questionId: string,
  ): Promise<MediaResourceResponseDto[]> {
    return this.mediaService.getMediaByQuestionId(questionId);
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: 'Get active media resources associated with a question group' })
  @ApiParam({ name: 'groupId', format: 'uuid', description: 'Question Group UUID' })
  @ApiOkResponse({
    description: 'List of media resources for the question group',
    type: [MediaResourceResponseDto],
  })
  @ApiNotFoundResponse({ description: 'Question group not found' })
  async getMediaByQuestionGroupId(
    @Param('groupId', new ParseUUIDPipe({ version: '4' })) groupId: string,
  ): Promise<MediaResourceResponseDto[]> {
    return this.mediaService.getMediaByQuestionGroupId(groupId);
  }

  @Patch(':id/target')
  @ApiOperation({
    summary: 'Update media resource target link (questionId or questionGroupId)',
    description: 'Attaches, detaches, or switches media association with whitelist status validation.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Media Resource UUID' })
  @ApiOkResponse({
    description: 'Media resource target updated successfully',
    type: MediaResourceResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Target is in pending_review or published state' })
  @ApiNotFoundResponse({ description: 'Media resource or target not found' })
  async updateTarget(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateMediaTargetDto,
  ): Promise<MediaResourceResponseDto> {
    return this.mediaService.updateTarget(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft-delete a media resource',
    description: 'Marks media as deleted if associated question/group is in draft or revision_requested state.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Media Resource UUID' })
  @ApiNoContentResponse({ description: 'Media resource soft-deleted successfully' })
  @ApiBadRequestResponse({ description: 'Cannot delete media attached to published or pending_review content' })
  @ApiNotFoundResponse({ description: 'Media resource not found' })
  async deleteMedia(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    await this.mediaService.deleteMedia(id);
  }
}
