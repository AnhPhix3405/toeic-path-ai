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
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PolicyThrottlerGuard } from '../../../common/rate-limit/guards/policy-throttler.guard';
import { ThrottlePolicy } from '../../../common/rate-limit/decorators/throttle-policy.decorator';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import {
  ApiAbandonAttemptDoc,
  ApiBatchSaveAnswersDoc,
  ApiExamAttemptsControllerDoc,
  ApiGetAttemptOverviewDoc,
  ApiGetAttemptQuestionsDoc,
  ApiSaveAnswerDoc,
  ApiStartAttemptDoc,
} from '../docs/exam-attempts.doc';
import { CreateExamAttemptDto } from '../dto/request/create-exam-attempt.dto';
import { QueryAttemptQuestionsDto } from '../dto/request/query-attempt-questions.dto';
import { SaveAnswerDto } from '../dto/request/save-answer.dto';
import { BatchSaveAnswersDto } from '../dto/request/batch-save-answers.dto';
import { ExamAttemptSummaryResponseDto } from '../dto/response/exam-attempt-summary-response.dto';
import { AbandonAttemptResponseDto } from '../dto/response/abandon-attempt-response.dto';
import { ExamAttemptOverviewResponseDto } from '../dto/response/exam-attempt-overview-response.dto';
import { ExamAttemptQuestionsResponseDto } from '../dto/response/exam-attempt-questions-response.dto';
import { SaveAnswerResponseDto } from '../dto/response/save-answer-response.dto';
import { BatchSaveAnswersResponseDto } from '../dto/response/batch-save-answers-response.dto';
import { ExamAttemptsService } from '../services/exam-attempts.service';
import { ExamAttemptsDeliveryService } from '../services/exam-attempts-delivery.service';
import { ExamAttemptsAnswersService } from '../services/exam-attempts-answers.service';
import { UserRole } from '../../../common/enums/user-role.enum';

@ApiTags('Exam Attempts')
@ApiExamAttemptsControllerDoc()
@UseGuards(JwtAuthGuard, PolicyThrottlerGuard)
@Controller('exam-attempts')
export class ExamAttemptsController {
  constructor(
    private readonly examAttemptsService: ExamAttemptsService,
    private readonly examAttemptsDeliveryService: ExamAttemptsDeliveryService,
    private readonly examAttemptsAnswersService: ExamAttemptsAnswersService,
  ) {}

  @Post()
  @ThrottlePolicy('examsMutate')
  @ApiStartAttemptDoc()
  async startAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExamAttemptDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ExamAttemptSummaryResponseDto> {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || undefined;
    const result = await this.examAttemptsService.startAttempt(user.id, dto, ipAddress);

    // Dynamic HTTP Status Code (PMR 021)
    if (result.isResumed) {
      res.status(HttpStatus.OK);
    } else {
      res.status(HttpStatus.CREATED);
    }

    return result;
  }

  @Post(':id/abandon')
  @HttpCode(HttpStatus.OK)
  @ThrottlePolicy('examsMutate')
  @ApiAbandonAttemptDoc()
  async abandonAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AbandonAttemptResponseDto> {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.examAttemptsService.abandonAttempt(user.id, id, isAdmin);
  }

  @Get(':id/questions')
  @ThrottlePolicy('questionsSearch')
  @ApiGetAttemptQuestionsDoc()
  async getAttemptQuestions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryAttemptQuestionsDto,
  ): Promise<ExamAttemptQuestionsResponseDto> {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.examAttemptsDeliveryService.getAttemptQuestions(user.id, id, query, isAdmin);
  }

  @Get(':id')
  @ThrottlePolicy('questionsSearch')
  @ApiGetAttemptOverviewDoc()
  async getAttemptOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExamAttemptOverviewResponseDto> {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.examAttemptsDeliveryService.getAttemptOverview(user.id, id, isAdmin);
  }

  @Put(':id/answers/batch')
  @ThrottlePolicy('examBatchSave')
  @ApiBatchSaveAnswersDoc()
  async batchSaveAnswers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BatchSaveAnswersDto,
  ): Promise<BatchSaveAnswersResponseDto> {
    return this.examAttemptsAnswersService.batchSaveAnswers(user.id, id, dto);
  }

  @Put(':id/answers')
  @ThrottlePolicy('examAnswerSave')
  @ApiSaveAnswerDoc()
  async saveAnswer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveAnswerDto,
  ): Promise<SaveAnswerResponseDto> {
    return this.examAttemptsAnswersService.saveAnswer(user.id, id, dto);
  }
}
