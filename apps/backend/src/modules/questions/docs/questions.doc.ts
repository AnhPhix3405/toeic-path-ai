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
import { AssignQuestionGroupDto } from '../dto/request/assign-question-group.dto';
import { CreateQuestionOptionDto } from '../dto/request/create-question-option.dto';
import { CreateQuestionDto } from '../dto/request/create-question.dto';
import { SetCorrectAnswerDto } from '../dto/request/set-correct-answer.dto';
import { UpdateQuestionClassificationDto } from '../dto/request/update-question-classification.dto';
import { UpdateQuestionOptionDto } from '../dto/request/update-question-option.dto';
import { UpdateQuestionDto } from '../dto/request/update-question.dto';
import { PaginatedQuestionsResponseDto } from '../dto/response/paginated-questions-response.dto';
import { QuestionOptionResponseDto } from '../dto/response/question-option-response.dto';
import { QuestionResponseDto } from '../dto/response/question-response.dto';

export function ApiQuestionsControllerDoc() {
  return applyDecorators(
    ApiAuthDoc({
      unauthorizedDescription: 'Access token is invalid or absent',
      forbiddenDescription: 'Authenticated user has an unsupported role or does not own the question',
    }),
    ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' }),
  );
}

export function ApiCreateQuestionDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a question as a Teacher or Admin' }),
    ApiBody({ type: CreateQuestionDto }),
    ApiCreatedResponse({ type: QuestionResponseDto }),
    ApiBadRequestResponse({ description: 'Invalid request data' }),
  );
}

export function ApiFindQuestionsDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Search and filter questions with pagination as a Teacher or Admin' }),
    ApiOkResponse({ type: PaginatedQuestionsResponseDto }),
    ApiBadRequestResponse({ description: 'Invalid query parameters' }),
  );
}

export function ApiFindQuestionDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Get any question as a Teacher or Admin' }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiOkResponse({ type: QuestionResponseDto }),
    ApiBadRequestResponse({ description: 'Invalid question id' }),
    ApiNotFoundResponse({ description: 'Question not found' }),
  );
}

export function ApiUpdateQuestionDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update an owned question',
      description:
        'Teachers and Admins may update only questions they created. Admin does not bypass ownership.',
    }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiBody({ type: UpdateQuestionDto }),
    ApiOkResponse({ type: QuestionResponseDto }),
    ApiBadRequestResponse({ description: 'Invalid question id or request data' }),
    ApiNotFoundResponse({ description: 'Question not found' }),
  );
}

export function ApiUpdateQuestionClassificationDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Replace the classification of an owned question',
      description:
        'Validates all references and atomically replaces Part, Topics, Skills, and Difficulty. Admin does not bypass ownership.',
    }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiBody({ type: UpdateQuestionClassificationDto }),
    ApiOkResponse({ type: QuestionResponseDto }),
    ApiBadRequestResponse({
      description: 'Invalid id, duplicate ids, or unknown classification reference',
    }),
    ApiNotFoundResponse({ description: 'Question not found' }),
  );
}

export function ApiAssignQuestionGroupDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Assign or move an owned question to a group',
      description: 'Only the question owner may change its group. Admin does not bypass ownership.',
    }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiBody({ type: AssignQuestionGroupDto }),
    ApiOkResponse({ type: QuestionResponseDto }),
    ApiBadRequestResponse({ description: 'Invalid id, group id, or group order' }),
    ApiNotFoundResponse({ description: 'Question or question group not found' }),
    ApiConflictResponse({ description: 'The group order is already in use' }),
  );
}

export function ApiDetachQuestionGroupDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Detach an owned question from its group',
      description: 'The question remains available as an independent question.',
    }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiOkResponse({ type: QuestionResponseDto }),
    ApiBadRequestResponse({ description: 'Invalid question id' }),
    ApiNotFoundResponse({ description: 'Question not found' }),
  );
}

export function ApiCreateQuestionOptionDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Add an option to an owned question',
      description: 'Only the question owner may manage options. Admin does not bypass ownership.',
    }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiBody({ type: CreateQuestionOptionDto }),
    ApiCreatedResponse({ type: QuestionOptionResponseDto }),
    ApiBadRequestResponse({ description: 'Invalid question id or option data' }),
    ApiConflictResponse({ description: 'The option position conflicts with an existing option' }),
    ApiNotFoundResponse({ description: 'Question not found' }),
  );
}

export function ApiUpdateQuestionOptionDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Update an option of an owned question' }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiParam({ name: 'optionId', format: 'uuid' }),
    ApiBody({ type: UpdateQuestionOptionDto }),
    ApiOkResponse({ type: QuestionOptionResponseDto }),
    ApiBadRequestResponse({ description: 'Invalid id or option data' }),
    ApiConflictResponse({ description: 'The option position conflicts with an existing option' }),
    ApiNotFoundResponse({ description: 'Question or option not found' }),
  );
}

export function ApiRemoveQuestionOptionDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete an option of an owned question' }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiParam({ name: 'optionId', format: 'uuid' }),
    ApiNoContentResponse({ description: 'Question option deleted' }),
    ApiBadRequestResponse({ description: 'Invalid question or option id' }),
    ApiNotFoundResponse({ description: 'Question or option not found' }),
  );
}

export function ApiSetCorrectAnswerDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Set the correct option for an owned question',
      description:
        'This atomically clears the previous correct option before setting the selected one.',
    }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiBody({ type: SetCorrectAnswerDto }),
    ApiOkResponse({ type: QuestionOptionResponseDto }),
    ApiBadRequestResponse({ description: 'Invalid question or option id' }),
    ApiNotFoundResponse({ description: 'Question or option not found' }),
  );
}

export function ApiRemoveQuestionDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete an owned question',
      description:
        'Teachers and Admins may delete only questions they created. Admin does not bypass ownership.',
    }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiNoContentResponse({ description: 'Question deleted' }),
    ApiBadRequestResponse({ description: 'Invalid question id' }),
    ApiNotFoundResponse({ description: 'Question not found' }),
  );
}
