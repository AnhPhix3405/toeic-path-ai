import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ApiAuthDoc } from '../../../common/decorators/swagger';
import { CreateQuestionGroupDto } from '../dto/request/create-question-group.dto';
import { UpdateQuestionGroupDto } from '../dto/request/update-question-group.dto';
import { QuestionGroupResponseDto } from '../dto/response/question-group-response.dto';

export function ApiQuestionGroupsControllerDoc() {
  return applyDecorators(
    ApiAuthDoc({
      unauthorizedDescription: 'Access token is invalid or absent',
      forbiddenDescription: 'Authenticated user has an unsupported role or does not own the group',
    }),
    ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' }),
  );
}

export function ApiCreateQuestionGroupDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a question group as a Teacher or Admin' }),
    ApiBody({ type: CreateQuestionGroupDto }),
    ApiCreatedResponse({ type: QuestionGroupResponseDto }),
    ApiBadRequestResponse({ description: 'Invalid request data' }),
  );
}

export function ApiFindAllQuestionGroupsDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'List all question groups as a Teacher or Admin' }),
    ApiOkResponse({ type: QuestionGroupResponseDto, isArray: true }),
  );
}

export function ApiFindOneQuestionGroupDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Get any question group and its ordered questions' }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiOkResponse({ type: QuestionGroupResponseDto }),
    ApiBadRequestResponse({ description: 'Invalid question group id' }),
    ApiNotFoundResponse({ description: 'Question group not found' }),
  );
}

export function ApiUpdateQuestionGroupDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update an owned question group',
      description: 'Admin does not bypass ownership.',
    }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiBody({ type: UpdateQuestionGroupDto }),
    ApiOkResponse({ type: QuestionGroupResponseDto }),
    ApiBadRequestResponse({ description: 'Invalid question group id or request data' }),
    ApiNotFoundResponse({ description: 'Question group not found' }),
    ApiConflictResponse({ description: 'Question group update conflicts with existing data' }),
  );
}

export function ApiRemoveQuestionGroupDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete an owned question group and detach its questions',
      description: 'Questions are not deleted. Admin does not bypass ownership.',
    }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiNoContentResponse({ description: 'Question group deleted and questions detached' }),
    ApiBadRequestResponse({ description: 'Invalid question group id' }),
    ApiNotFoundResponse({ description: 'Question group not found' }),
  );
}
