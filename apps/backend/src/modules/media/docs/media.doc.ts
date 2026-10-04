import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ApiAuthDoc } from '../../../common/decorators/swagger';
import { MediaResourceResponseDto } from '../dto/response/media-resource-response.dto';
import {
  BatchPresignedUrlResponseDto,
  PresignedUrlResponseDto,
} from '../dto/response/presigned-url-response.dto';

export function ApiMediaControllerDoc() {
  return applyDecorators(
    ApiAuthDoc({
      unauthorizedDescription: 'Access token is invalid or absent',
      forbiddenDescription:
        'Authenticated user does not have permission to manage media resources',
    }),
  );
}

export function ApiCreatePresignedUrlDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Request a presigned upload URL for direct media upload',
      description:
        'Generates a signed upload URL to upload audio (<=15MB) or images (<=5MB) directly to Cloud Storage.',
    }),
    ApiCreatedResponse({
      description: 'Presigned upload URL successfully created',
      type: PresignedUrlResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Invalid file quota or unsupported MIME type' }),
  );
}

export function ApiCreateBatchPresignedUrlsDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Request multiple presigned upload URLs (1-10 files)',
      description:
        'Generates an array of signed upload URLs for multi-file TOEIC question assets.',
    }),
    ApiCreatedResponse({
      description: 'Batch presigned upload URLs successfully created',
      type: BatchPresignedUrlResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Invalid file list or batch size exceeded' }),
  );
}

export function ApiConfirmUploadDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Confirm direct upload and create media resource record',
      description:
        'Verifies file existence on Cloud Storage and saves metadata to media_resources table.',
    }),
    ApiCreatedResponse({
      description: 'Media resource verified and registered successfully',
      type: MediaResourceResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'File not found on storage, quota exceeded, or invalid target',
    }),
  );
}

export function ApiGetMediaByIdDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Get media resource details by ID' }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Media Resource UUID' }),
    ApiOkResponse({
      description: 'Media resource details returned',
      type: MediaResourceResponseDto,
    }),
    ApiNotFoundResponse({ description: 'Media resource not found' }),
  );
}

export function ApiGetMediaByQuestionIdDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Get active media resources associated with a question' }),
    ApiParam({ name: 'questionId', format: 'uuid', description: 'Question UUID' }),
    ApiOkResponse({
      description: 'List of media resources for the question',
      type: [MediaResourceResponseDto],
    }),
    ApiNotFoundResponse({ description: 'Question not found' }),
  );
}

export function ApiGetMediaByQuestionGroupIdDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Get active media resources associated with a question group' }),
    ApiParam({ name: 'groupId', format: 'uuid', description: 'Question Group UUID' }),
    ApiOkResponse({
      description: 'List of media resources for the question group',
      type: [MediaResourceResponseDto],
    }),
    ApiNotFoundResponse({ description: 'Question group not found' }),
  );
}

export function ApiUpdateMediaTargetDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update media resource target link (questionId or questionGroupId)',
      description:
        'Attaches, detaches, or switches media association with whitelist status validation.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Media Resource UUID' }),
    ApiOkResponse({
      description: 'Media resource target updated successfully',
      type: MediaResourceResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Target is in pending_review or published state' }),
    ApiNotFoundResponse({ description: 'Media resource or target not found' }),
  );
}

export function ApiDeleteMediaDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Soft-delete a media resource',
      description:
        'Marks media as deleted if associated question/group is in draft or revision_requested state.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Media Resource UUID' }),
    ApiNoContentResponse({ description: 'Media resource soft-deleted successfully' }),
    ApiBadRequestResponse({
      description: 'Cannot delete media attached to published or pending_review content',
    }),
    ApiNotFoundResponse({ description: 'Media resource not found' }),
  );
}
