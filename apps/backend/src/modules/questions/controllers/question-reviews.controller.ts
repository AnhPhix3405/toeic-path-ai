import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ThrottlePolicy } from '../../../common/rate-limit/decorators/throttle-policy.decorator';
import { PolicyThrottlerGuard } from '../../../common/rate-limit/guards/policy-throttler.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ApiApproveQuestionDoc,
  ApiBatchApproveDoc,
  ApiGetHistoriesDoc,
  ApiGetReviewLogsDoc,
  ApiGetReviewQueueDoc,
  ApiQuestionReviewsTag,
  ApiQuickFixApproveDoc,
  ApiRejectQuestionDoc,
  ApiRequestRevisionDoc,
} from '../docs/question-reviews.doc';
import { ApproveQuestionDto } from '../dto/request/approve-question.dto';
import { BatchApproveQuestionsDto } from '../dto/request/batch-approve-questions.dto';
import { QueryReviewQueueDto } from '../dto/request/query-review-queue.dto';
import { QuickFixApproveDto } from '../dto/request/quick-fix-approve.dto';
import { RejectQuestionDto } from '../dto/request/reject-question.dto';
import { RequestRevisionDto } from '../dto/request/request-revision.dto';
import { BatchReviewResponseDto } from '../dto/response/batch-review-response.dto';
import { QuestionHistoryResponseDto } from '../dto/response/question-history-response.dto';
import { QuestionReviewLogResponseDto } from '../dto/response/question-review-log-response.dto';
import { ReviewActionResponseDto } from '../dto/response/review-action-response.dto';
import { QuestionHistoriesService } from '../services/question-histories.service';
import { QuestionReviewsService } from '../services/question-reviews.service';

@ApiQuestionReviewsTag()
@Controller('questions/reviews')
@UseGuards(JwtAuthGuard, RolesGuard, PolicyThrottlerGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
@ThrottlePolicy('questionsReviews')
export class QuestionReviewsController {
  constructor(
    private readonly reviewsService: QuestionReviewsService,
    private readonly historiesService: QuestionHistoriesService,
  ) {}

  @Get('queue')
  @ApiGetReviewQueueDoc()
  async getReviewQueue(@Query() dto: QueryReviewQueueDto) {
    return this.reviewsService.getReviewQueue(dto);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiApproveQuestionDoc()
  async approveQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveQuestionDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ): Promise<ReviewActionResponseDto> {
    return this.reviewsService.approveQuestion(id, dto, user.id, user.role);
  }

  @Post(':id/request-revision')
  @HttpCode(HttpStatus.OK)
  @ApiRequestRevisionDoc()
  async requestRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestRevisionDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ): Promise<ReviewActionResponseDto> {
    return this.reviewsService.requestRevision(id, dto, user.id, user.role);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiRejectQuestionDoc()
  async rejectQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectQuestionDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ): Promise<ReviewActionResponseDto> {
    return this.reviewsService.rejectQuestion(id, dto, user.id, user.role);
  }

  @Put(':id/quick-fix')
  @HttpCode(HttpStatus.OK)
  @ApiQuickFixApproveDoc()
  async quickFixApprove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: QuickFixApproveDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ): Promise<ReviewActionResponseDto> {
    return this.reviewsService.quickFixApprove(id, dto, user.id, user.role);
  }

  @Post('batch-approve')
  @HttpCode(HttpStatus.OK)
  @ApiBatchApproveDoc()
  async batchApprove(
    @Body() dto: BatchApproveQuestionsDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ): Promise<BatchReviewResponseDto> {
    return this.reviewsService.batchApprove(dto, user.id, user.role);
  }

  @Get(':id/histories')
  @ApiGetHistoriesDoc()
  async getHistories(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuestionHistoryResponseDto[]> {
    return this.historiesService.getHistoriesByQuestionId(id);
  }

  @Get(':id/logs')
  @ApiGetReviewLogsDoc()
  async getReviewLogs(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuestionReviewLogResponseDto[]> {
    return this.reviewsService.getReviewLogs(id);
  }
}
