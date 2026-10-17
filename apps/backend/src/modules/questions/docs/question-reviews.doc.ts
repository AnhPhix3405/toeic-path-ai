import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ApproveQuestionDto } from '../dto/request/approve-question.dto';
import { BatchApproveQuestionsDto } from '../dto/request/batch-approve-questions.dto';
import { QuickFixApproveDto } from '../dto/request/quick-fix-approve.dto';
import { RejectQuestionDto } from '../dto/request/reject-question.dto';
import { RequestRevisionDto } from '../dto/request/request-revision.dto';
import { BatchReviewResponseDto } from '../dto/response/batch-review-response.dto';
import { QuestionHistoryResponseDto } from '../dto/response/question-history-response.dto';
import { QuestionReviewLogResponseDto } from '../dto/response/question-review-log-response.dto';
import { ReviewActionResponseDto } from '../dto/response/review-action-response.dto';

export function ApiQuestionReviewsTag() {
  return applyDecorators(
    ApiTags('Question Reviews'),
    ApiBearerAuth(),
    ApiForbiddenResponse({
      description: 'Forbidden: Insufficient role or self-review violation (ERR_CANNOT_SELF_REVIEW)',
    }),
    ApiTooManyRequestsResponse({ description: 'Too many requests: Rate limit policy exceeded' }),
  );
}

export function ApiGetReviewQueueDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get pending question review queue with filters and eager group context',
      description:
        'Retrieves paginated questions in PENDING_REVIEW status with TOEIC part, options, creator, and question group context.',
    }),
    ApiQuery({ name: 'partId', required: false, description: 'Filter by TOEIC Part UUID' }),
    ApiQuery({
      name: 'topicIds',
      required: false,
      isArray: true,
      type: String,
      description: 'Filter by Topic UUIDs',
    }),
    ApiQuery({ name: 'creatorId', required: false, description: 'Filter by creator UUID' }),
    ApiQuery({
      name: 'search',
      required: false,
      description: 'Search keywords in question text/explanation',
    }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiOkResponse({ description: 'Review queue list with pagination metadata' }),
  );
}

export function ApiApproveQuestionDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Approve a single question (Maker-Checker enforced)',
      description:
        'Approves question to PUBLISHED status. Enforces Maker-Checker (cannot self-review unless Admin with emergencyBypass) and Optimistic Locking.',
    }),
    ApiParam({ name: 'id', description: 'Question UUID' }),
    ApiBody({ type: ApproveQuestionDto }),
    ApiOkResponse({ type: ReviewActionResponseDto, description: 'Question approved successfully' }),
    ApiConflictResponse({
      description: 'Concurrency conflict: Version mismatch (ERR_CONCURRENCY_CONFLICT)',
    }),
    ApiNotFoundResponse({ description: 'Question not found' }),
  );
}

export function ApiRequestRevisionDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Request revision for a question with mandatory feedback',
      description:
        'Moves question to REVISION_REQUESTED status. Requires mandatory feedback and current version. Supports optional applyToWholeGroup flag.',
    }),
    ApiParam({ name: 'id', description: 'Question UUID' }),
    ApiBody({ type: RequestRevisionDto }),
    ApiOkResponse({
      type: ReviewActionResponseDto,
      description: 'Revision requested successfully',
    }),
    ApiConflictResponse({
      description: 'Concurrency conflict: Version mismatch (ERR_CONCURRENCY_CONFLICT)',
    }),
    ApiNotFoundResponse({ description: 'Question not found' }),
  );
}

export function ApiRejectQuestionDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Reject a question with mandatory feedback',
      description:
        'Moves question to REJECTED status. Requires mandatory feedback and current version. Supports optional applyToWholeGroup flag.',
    }),
    ApiParam({ name: 'id', description: 'Question UUID' }),
    ApiBody({ type: RejectQuestionDto }),
    ApiOkResponse({ type: ReviewActionResponseDto, description: 'Question rejected successfully' }),
    ApiConflictResponse({
      description: 'Concurrency conflict: Version mismatch (ERR_CONCURRENCY_CONFLICT)',
    }),
    ApiNotFoundResponse({ description: 'Question not found' }),
  );
}

export function ApiQuickFixApproveDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Quick-fix question content/options and approve directly',
      description:
        'Updates typo/fields, snapshots previous version into question_histories, bumps version, and moves to PUBLISHED status in a single transaction.',
    }),
    ApiParam({ name: 'id', description: 'Question UUID' }),
    ApiBody({ type: QuickFixApproveDto }),
    ApiOkResponse({
      type: ReviewActionResponseDto,
      description: 'Question quick-fixed and approved successfully',
    }),
    ApiBadRequestResponse({
      description: 'Bad Request: Invalid data or Single Choice Invariant violation',
    }),
    ApiConflictResponse({
      description: 'Concurrency conflict: Version mismatch (ERR_CONCURRENCY_CONFLICT)',
    }),
    ApiNotFoundResponse({ description: 'Question not found' }),
  );
}

export function ApiBatchApproveDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Batch approve multiple questions with isolated item transactions',
      description:
        'Processes batch approval where valid questions are published and items with version conflicts or Maker-Checker violations are skipped.',
    }),
    ApiBody({ type: BatchApproveQuestionsDto }),
    ApiOkResponse({ type: BatchReviewResponseDto, description: 'Batch approval result summary' }),
  );
}

export function ApiGetHistoriesDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get change snapshot history for a question',
      description:
        'Retrieves ordered historical snapshots (before and after) for the specified question.',
    }),
    ApiParam({ name: 'id', description: 'Question UUID' }),
    ApiOkResponse({
      type: [QuestionHistoryResponseDto],
      description: 'List of historical snapshots',
    }),
    ApiNotFoundResponse({ description: 'Question not found' }),
  );
}

export function ApiGetReviewLogsDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get review audit logs for a question',
      description:
        'Retrieves all review actions, decisions, and reviewer feedback recorded for the question.',
    }),
    ApiParam({ name: 'id', description: 'Question UUID' }),
    ApiOkResponse({
      type: [QuestionReviewLogResponseDto],
      description: 'List of review log entries',
    }),
    ApiNotFoundResponse({ description: 'Question not found' }),
  );
}
