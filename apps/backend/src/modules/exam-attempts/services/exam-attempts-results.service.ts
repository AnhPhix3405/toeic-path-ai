import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Exam } from '../../exams/entities/exam.entity';
import { ScoreConversionType } from '../../exams/enums/score-conversion-type.enum';
import { QuestionGroup } from '../../question-groups/entities/question-group.entity';
import { Question } from '../../questions/entities/question.entity';
import { QueryAttemptHistoryDto } from '../dto/request/query-attempt-history.dto';
import { QueryAttemptReviewDto } from '../dto/request/query-attempt-review.dto';
import {
  ExamAttemptHistoryItemDto,
  PaginatedExamAttemptHistoryResponseDto,
} from '../dto/response/exam-attempt-history-response.dto';
import { ExamAttemptResultResponseDto } from '../dto/response/exam-attempt-result-response.dto';
import {
  ExamAttemptReviewResponseDto,
  QuestionGroupReviewDto,
  QuestionReviewItemDto,
  ReviewFilterCountsDto,
} from '../dto/response/exam-attempt-review-response.dto';
import { ExamAttemptAnswer } from '../entities/exam-attempt-answer.entity';
import { ExamAttemptSnapshot } from '../entities/exam-attempt-snapshot.entity';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { AttemptReviewFilter } from '../enums/attempt-review-filter.enum';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';
import { isUuidIdentifier } from '../../../common/utils/identifier.util';

interface SnapshotOption {
  id: string;
  label: string;
  content?: string | null;
}

interface SnapshotQuestionGroup {
  id: string;
  title?: string | null;
  passageText?: string | null;
  context?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  transcript?: string | null;
}

interface SnapshotQuestion {
  id: string;
  partNumber: number;
  orderIndex: number;
  originalQuestionNumber?: number | null;
  questionGroupId?: string | null;
  questionGroup?: SnapshotQuestionGroup | null;
  content?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  transcript?: string | null;
  explanation?: string | null;
  options?: SnapshotOption[];
}

@Injectable()
export class ExamAttemptsResultsService {
  constructor(
    @InjectRepository(ExamAttempt)
    private readonly examAttemptRepository: Repository<ExamAttempt>,
    @InjectRepository(ExamAttemptSnapshot)
    private readonly examAttemptSnapshotRepository: Repository<ExamAttemptSnapshot>,
    @InjectRepository(ExamAttemptAnswer)
    private readonly examAttemptAnswerRepository: Repository<ExamAttemptAnswer>,
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(QuestionGroup)
    private readonly questionGroupRepository: Repository<QuestionGroup>,
  ) {}

  async getAttemptResult(
    userId: string,
    attemptId: string,
    isAdmin: boolean = false,
  ): Promise<ExamAttemptResultResponseDto> {
    const attempt = await this.examAttemptRepository.findOne({
      where: isUuidIdentifier(attemptId) ? { id: attemptId } : { attemptCode: attemptId.trim() },
    });

    this.ensureAttemptSubmittedAndGraded(attempt, userId, isAdmin);

    // PMR 027 & PMR 030: Do NOT filter exam.isDeleted = false so soft-deleted exams preserve student results
    const exam = await this.examRepository.findOne({
      where: { id: attempt.examId },
    });

    let examTitle = exam?.title;
    let scoreConversionType = exam?.scoreConversionType;
    let passingScore = exam?.passingScore ?? null;

    if (!exam) {
      const snapshot = await this.examAttemptSnapshotRepository.findOne({
        where: { attemptId: attempt.id },
        select: { id: true, examMetadata: true },
      });
      const meta = (snapshot?.examMetadata ?? {}) as Record<string, unknown>;
      examTitle = typeof meta.title === 'string' ? meta.title : 'Đề thi không xác định';
      scoreConversionType =
        (meta.scoreConversionType as ScoreConversionType) ?? ScoreConversionType.DEFAULT_ETS;
      passingScore = typeof meta.passingScore === 'number' ? meta.passingScore : null;
    }

    const dto = new ExamAttemptResultResponseDto();
    dto.attemptId = attempt.id;
    dto.examId = attempt.examId;
    dto.examTitle = examTitle ?? 'Đề thi không xác định';
    dto.mode = attempt.mode;
    dto.selectedParts = attempt.selectedParts ?? null;
    dto.scoreConversionType = scoreConversionType ?? ScoreConversionType.DEFAULT_ETS;
    dto.status = attempt.status;
    dto.startedAt = attempt.startedAt;
    dto.submittedAt = attempt.submittedAt!;
    dto.gradedAt = attempt.gradedAt!;
    dto.durationSpentSeconds = attempt.durationSpentSeconds ?? 0;
    dto.totalScore = attempt.totalScore ?? null;
    dto.listeningScore = attempt.listeningScore ?? null;
    dto.readingScore = attempt.readingScore ?? null;
    dto.passingScore = passingScore;
    dto.isPassed = attempt.isPassed ?? null;
    dto.totalQuestions = attempt.totalQuestions;
    dto.correctCount = attempt.correctCount ?? 0;
    dto.wrongCount = attempt.wrongCount ?? 0;
    dto.skippedCount = attempt.skippedCount ?? 0;
    dto.accuracyPercentage =
      attempt.accuracyPercentage !== null && attempt.accuracyPercentage !== undefined
        ? Number(attempt.accuracyPercentage)
        : 0;
    dto.partBreakdown = attempt.partBreakdown ?? [];
    dto.skillBreakdown = attempt.skillBreakdown ?? [];

    return dto;
  }

  async getAttemptHistory(
    userId: string,
    query: QueryAttemptHistoryDto,
  ): Promise<PaginatedExamAttemptHistoryResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const parsedFromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const parsedToDate = query.toDate
      ? /^\d{4}-\d{2}-\d{2}$/.test(query.toDate)
        ? new Date(`${query.toDate}T23:59:59.999Z`)
        : new Date(query.toDate)
      : undefined;

    if (parsedFromDate && parsedToDate && parsedFromDate.getTime() > parsedToDate.getTime()) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_DATE_RANGE',
        message: 'Ngày bắt đầu (fromDate) không được lớn hơn ngày kết thúc (toDate)',
      });
    }

    // PMR 027 & PMR 030: Select only scalar columns + 'exam.id' and 'exam.title' (exclude JSONB columns)
    const qb = this.examAttemptRepository
      .createQueryBuilder('attempt')
      .leftJoin('attempt.exam', 'exam')
      .select([
        'attempt.id',
        'attempt.attemptCode',
        'attempt.examId',
        'attempt.mode',
        'attempt.selectedParts',
        'attempt.status',
        'attempt.totalScore',
        'attempt.listeningScore',
        'attempt.readingScore',
        'attempt.correctCount',
        'attempt.totalQuestions',
        'attempt.accuracyPercentage',
        'attempt.durationSpentSeconds',
        'attempt.isPassed',
        'attempt.startedAt',
        'attempt.submittedAt',
        'exam.id',
        'exam.title',
      ])
      .where('attempt.userId = :userId', { userId });

    if (query.examId) {
      qb.andWhere('attempt.examId = :examId', { examId: query.examId });
    }
    if (query.mode) {
      qb.andWhere('attempt.mode = :mode', { mode: query.mode });
    }
    if (query.status) {
      qb.andWhere('attempt.status = :status', { status: query.status });
    }
    if (parsedFromDate) {
      qb.andWhere('attempt.startedAt >= :fromDate', { fromDate: parsedFromDate });
    }
    if (parsedToDate) {
      qb.andWhere('attempt.startedAt <= :toDate', { toDate: parsedToDate });
    }

    qb.orderBy('attempt.startedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [attempts, total] = await qb.getManyAndCount();

    const items: ExamAttemptHistoryItemDto[] = attempts.map((attempt) => ({
      attemptId: attempt.id,
      attemptCode: attempt.attemptCode,
      examId: attempt.examId,
      examTitle: attempt.exam?.title ?? 'Đề thi không xác định',
      mode: attempt.mode,
      selectedParts: attempt.selectedParts ?? null,
      status: attempt.status,
      totalScore: attempt.totalScore ?? null,
      listeningScore: attempt.listeningScore ?? null,
      readingScore: attempt.readingScore ?? null,
      correctCount: attempt.correctCount ?? null,
      totalQuestions: attempt.totalQuestions,
      accuracyPercentage:
        attempt.accuracyPercentage !== null && attempt.accuracyPercentage !== undefined
          ? Number(attempt.accuracyPercentage)
          : null,
      durationSpentSeconds: attempt.durationSpentSeconds ?? null,
      isPassed: attempt.isPassed ?? null,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt ?? null,
    }));

    const response = new PaginatedExamAttemptHistoryResponseDto();
    response.items = items;
    response.total = total;
    response.page = page;
    response.limit = limit;
    response.totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return response;
  }

  async getAttemptReview(
    userId: string,
    attemptId: string,
    query: QueryAttemptReviewDto,
    isAdmin: boolean = false,
  ): Promise<ExamAttemptReviewResponseDto> {
    const attempt = await this.examAttemptRepository.findOne({
      where: isUuidIdentifier(attemptId) ? { id: attemptId } : { attemptCode: attemptId.trim() },
    });

    this.ensureAttemptSubmittedAndGraded(attempt, userId, isAdmin);

    const requestedPartNumber = query.partNumber ?? query.part;

    // PMR 027: Validate partNumber boundary in part_practice mode
    if (attempt.mode === PartPracticeMode.PART_PRACTICE && requestedPartNumber != null) {
      const selectedParts = attempt.selectedParts ?? [];
      if (!selectedParts.includes(requestedPartNumber)) {
        throw new BadRequestException({
          errorCode: 'ERR_PART_NOT_IN_ATTEMPT',
          message: `Part ${requestedPartNumber} không nằm trong danh sách các phần được chọn làm bài của lượt thi này`,
        });
      }
    }

    // PMR 030: Defensive Missing Snapshot Guard
    const snapshot = await this.examAttemptSnapshotRepository.findOne({
      where: { attemptId: attempt.id },
    });

    if (
      !snapshot ||
      !Array.isArray(snapshot.shuffledQuestions) ||
      snapshot.shuffledQuestions.length === 0
    ) {
      throw new InternalServerErrorException({
        errorCode: 'ERR_SNAPSHOT_NOT_FOUND',
        message: 'Không tìm thấy dữ liệu đề thi đã lưu',
      });
    }

    const allSnapshotQuestions = snapshot.shuffledQuestions as unknown as SnapshotQuestion[];
    const answerKey = snapshot.answerKeySnapshot || {};

    // Step A (PMR 030): Filter by partNumber first to form partScopedQuestions
    const partScopedQuestions = allSnapshotQuestions.filter(
      (q) => requestedPartNumber == null || q.partNumber === requestedPartNumber,
    );

    const savedAnswers = await this.examAttemptAnswerRepository.find({
      where: { attemptId: attempt.id },
    });
    const answerMap = new Map<string, ExamAttemptAnswer>();
    for (const ans of savedAnswers) {
      answerMap.set(ans.questionId, ans);
    }

    // Load latest explanation & transcript from questions & question_groups without filtering is_deleted (PMR 030)
    const questionIds = partScopedQuestions.map((q) => q.id);
    const groupIds = Array.from(
      new Set(
        partScopedQuestions
          .map((q) => q.questionGroupId ?? q.questionGroup?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const liveQuestionMap = new Map<string, Question & { transcript?: string | null }>();
    if (questionIds.length > 0) {
      const liveQuestions = await this.questionRepository.find({
        where: { id: In(questionIds) },
      });
      for (const lq of liveQuestions) {
        liveQuestionMap.set(lq.id, lq);
      }
    }

    const liveGroupMap = new Map<string, QuestionGroup & { transcript?: string | null }>();
    if (groupIds.length > 0) {
      const liveGroups = await this.questionGroupRepository.find({
        where: { id: In(groupIds) },
      });
      for (const lg of liveGroups) {
        liveGroupMap.set(lg.id, lg);
      }
    }

    // Step B (PMR 030): Compute filterCounts on partScopedQuestions BEFORE applying query.filter
    const filterCounts: ReviewFilterCountsDto = {
      all: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
      marked: 0,
    };

    const enrichedList: Array<{
      raw: SnapshotQuestion;
      dto: QuestionReviewItemDto;
    }> = [];

    for (const q of partScopedQuestions) {
      const ans = answerMap.get(q.id);
      const correctOptionId = answerKey[q.id] ?? null;
      const selectedOptionId = ans?.selectedOptionId ?? null;
      const isSkipped = selectedOptionId === null;
      const isCorrect = !isSkipped
        ? Boolean(ans?.isCorrect ?? selectedOptionId === correctOptionId)
        : false;
      const isMarkedForReview = Boolean(ans?.isMarkedForReview);
      const timeSpentSeconds = ans?.timeSpentSeconds ?? 0;

      filterCounts.all++;
      if (isSkipped) {
        filterCounts.skipped++;
      } else if (isCorrect) {
        filterCounts.correct++;
      } else {
        filterCounts.wrong++;
      }
      if (isMarkedForReview) {
        filterCounts.marked++;
      }

      const liveQ = liveQuestionMap.get(q.id);

      const itemDto = new QuestionReviewItemDto();
      itemDto.id = q.id;
      itemDto.partNumber = q.partNumber;
      itemDto.orderIndex = q.orderIndex;
      itemDto.originalQuestionNumber = q.originalQuestionNumber ?? null;
      itemDto.questionGroupId = q.questionGroupId ?? q.questionGroup?.id ?? null;
      itemDto.content = q.content ?? null;
      itemDto.audioUrl = q.audioUrl ?? null;
      itemDto.imageUrl = q.imageUrl ?? null;
      itemDto.transcript = liveQ?.transcript ?? q.transcript ?? null;
      // PMR 027: Preserve shuffled option order & labels A-D from Snapshot and attach isCorrect
      itemDto.options = (q.options || []).map((opt) => ({
        id: opt.id,
        label: opt.label,
        content: opt.content ?? null,
        isCorrect: opt.id === correctOptionId,
      }));
      itemDto.selectedOptionId = selectedOptionId;
      itemDto.correctOptionId = correctOptionId;
      itemDto.isCorrect = isCorrect;
      itemDto.isMarkedForReview = isMarkedForReview;
      itemDto.timeSpentSeconds = timeSpentSeconds;
      itemDto.explanation = liveQ?.explanation ?? q.explanation ?? null;

      enrichedList.push({ raw: q, dto: itemDto });
    }

    // Apply query.filter
    const activeFilter = query.filter ?? AttemptReviewFilter.ALL;
    const filteredList = enrichedList.filter(({ dto }) => {
      switch (activeFilter) {
        case AttemptReviewFilter.CORRECT:
          return dto.isCorrect === true;
        case AttemptReviewFilter.WRONG:
          return dto.selectedOptionId !== null && dto.isCorrect === false;
        case AttemptReviewFilter.SKIPPED:
          return dto.selectedOptionId === null;
        case AttemptReviewFilter.MARKED:
          return dto.isMarkedForReview === true;
        case AttemptReviewFilter.ALL:
        default:
          return true;
      }
    });

    // PMR 027: Deduplicate questionGroups AFTER filtering questions
    const groupDtoMap = new Map<string, QuestionGroupReviewDto>();
    const questions: QuestionReviewItemDto[] = [];

    for (const { raw, dto } of filteredList) {
      questions.push(dto);

      const gId = dto.questionGroupId;
      if (gId && !groupDtoMap.has(gId)) {
        const snapGroup = raw.questionGroup;
        const liveGroup = liveGroupMap.get(gId);
        const isListeningGroup = raw.partNumber === 3 || raw.partNumber === 4;

        groupDtoMap.set(gId, {
          id: gId,
          title: liveGroup?.title ?? snapGroup?.title ?? null,
          passageText: snapGroup?.passageText ?? liveGroup?.context ?? snapGroup?.context ?? null,
          audioUrl: snapGroup?.audioUrl ?? null,
          imageUrl: snapGroup?.imageUrl ?? null,
          transcript:
            liveGroup?.transcript ??
            snapGroup?.transcript ??
            (isListeningGroup ? (liveGroup?.context ?? snapGroup?.context ?? null) : null),
        });
      }
    }

    const response = new ExamAttemptReviewResponseDto();
    response.attemptId = attempt.id;
    response.filterCounts = filterCounts;
    response.questionGroups = Array.from(groupDtoMap.values());
    response.questions = questions;

    return response;
  }

  private ensureAttemptSubmittedAndGraded(
    attempt: ExamAttempt | null,
    userId: string,
    isAdmin: boolean,
  ): asserts attempt is ExamAttempt {
    if (!attempt) {
      throw new NotFoundException({
        errorCode: 'ERR_ATTEMPT_NOT_FOUND',
        message: 'Không tìm thấy lượt làm bài thi',
      });
    }

    if (attempt.userId !== userId && !isAdmin) {
      throw new ForbiddenException({
        errorCode: 'ERR_FORBIDDEN_ATTEMPT_ACCESS',
        message: 'Bạn không có quyền truy cập lượt làm bài này',
      });
    }

    if (
      attempt.status === ExamAttemptStatus.IN_PROGRESS ||
      attempt.status === ExamAttemptStatus.ABANDONED
    ) {
      throw new BadRequestException({
        errorCode: 'ERR_ATTEMPT_NOT_SUBMITTED',
        message: 'Lượt thi chưa được nộp nên không thể xem kết quả hoặc lời giải',
      });
    }

    if (attempt.gradedAt == null) {
      throw new ConflictException({
        errorCode: 'ERR_ATTEMPT_NOT_GRADED',
        message: 'Lượt thi đang trong quá trình chấm điểm, vui lòng thử lại sau',
      });
    }
  }
}
