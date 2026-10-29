import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { ExamAttemptSnapshot } from '../entities/exam-attempt-snapshot.entity';
import { ExamAttemptAnswer } from '../entities/exam-attempt-answer.entity';
import { QueryAttemptQuestionsDto } from '../dto/request/query-attempt-questions.dto';
import {
  AttemptQuestionStatusDto,
  ExamAttemptOverviewResponseDto,
} from '../dto/response/exam-attempt-overview-response.dto';
import {
  ExamAttemptQuestionsResponseDto,
  QuestionDeliveryItemDto,
  QuestionGroupDeliveryDto,
} from '../dto/response/exam-attempt-questions-response.dto';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';

interface SnapshotOption {
  id: string;
  label: string;
  content?: string | null;
}

interface SnapshotQuestionGroup {
  id: string;
  passageText?: string | null;
  context?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
}

interface SnapshotQuestion {
  id: string;
  partNumber: number;
  orderIndex: number;
  originalQuestionNumber?: number;
  questionGroupId?: string | null;
  questionGroup?: SnapshotQuestionGroup | null;
  content?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  options?: SnapshotOption[];
}

@Injectable()
export class ExamAttemptsDeliveryService {
  constructor(
    @InjectRepository(ExamAttempt)
    private readonly examAttemptRepository: Repository<ExamAttempt>,
    @InjectRepository(ExamAttemptSnapshot)
    private readonly examAttemptSnapshotRepository: Repository<ExamAttemptSnapshot>,
    @InjectRepository(ExamAttemptAnswer)
    private readonly examAttemptAnswerRepository: Repository<ExamAttemptAnswer>,
  ) {}

  async getAttemptOverview(
    userId: string,
    attemptId: string,
    isAdmin: boolean = false,
  ): Promise<ExamAttemptOverviewResponseDto> {
    const now = new Date();

    // 1. Tối ưu hóa hiệu năng & Chống Memory Leak (PMR 018):
    // Chỉ query các trường cần thiết từ exam_attempts, không eager load snapshot
    const attempt = await this.examAttemptRepository.findOne({
      where: { id: attemptId },
      relations: { exam: true },
    });

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

    // 2. Tính toán thời gian thực & Cờ trạng thái hết giờ (PMR 018)
    const remainingSeconds = Math.max(
      0,
      Math.floor((attempt.expiresAt.getTime() - now.getTime()) / 1000),
    );
    const isExpired = now.getTime() > attempt.expiresAt.getTime() + 30000;

    // 3. Lấy các câu trả lời đã lưu từ exam_attempt_answers
    const answers = await this.examAttemptAnswerRepository.find({
      where: { attemptId },
    });

    const answerMap = new Map<string, ExamAttemptAnswer>();
    let markedForReviewCount = 0;
    let answeredCount = 0;

    for (const ans of answers) {
      answerMap.set(ans.questionId, ans);
      if (ans.isMarkedForReview) {
        markedForReviewCount++;
      }
      if (ans.selectedOptionId) {
        answeredCount++;
      }
    }

    // 4. PMR 022: Ma trận tiến độ (questionsProgress) đầy đủ 1..N
    // Truy vấn trực tiếp snapshot để lấy danh mục id, partNumber, orderIndex của toàn bộ câu hỏi
    const snapshot = await this.examAttemptSnapshotRepository.findOne({
      where: { attemptId },
      select: { id: true, shuffledQuestions: true },
    });

    const questionsProgress: AttemptQuestionStatusDto[] = [];

    if (snapshot?.shuffledQuestions) {
      const rawList = snapshot.shuffledQuestions as unknown as SnapshotQuestion[];
      for (const q of rawList) {
        const ans = answerMap.get(q.id);
        questionsProgress.push({
          questionId: q.id,
          partNumber: q.partNumber,
          orderIndex: q.orderIndex,
          isAnswered: Boolean(ans?.selectedOptionId),
          isMarkedForReview: Boolean(ans?.isMarkedForReview),
        });
      }
    }

    const overview = new ExamAttemptOverviewResponseDto();
    overview.id = attempt.id;
    overview.examId = attempt.examId;
    overview.examTitle = attempt.exam?.title ?? 'Đề thi';
    overview.status = attempt.status;
    overview.mode = attempt.mode;
    overview.selectedParts = attempt.selectedParts ?? null;
    overview.startedAt = attempt.startedAt;
    overview.expiresAt = attempt.expiresAt;
    overview.remainingSeconds = remainingSeconds;
    overview.serverTimeNow = now;
    overview.isExpired = isExpired;
    overview.totalQuestions = attempt.totalQuestions;
    overview.answeredCount = answeredCount;
    overview.markedForReviewCount = markedForReviewCount;
    overview.questionsProgress = questionsProgress;

    return overview;
  }

  async getAttemptQuestions(
    userId: string,
    attemptId: string,
    query: QueryAttemptQuestionsDto,
    isAdmin: boolean = false,
  ): Promise<ExamAttemptQuestionsResponseDto> {
    const attempt = await this.examAttemptRepository.findOne({
      where: { id: attemptId },
    });

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

    // Kiểm tra biên (PMR 018): nếu mode = part_practice mà partNumber không có trong selectedParts
    if (attempt.mode === PartPracticeMode.PART_PRACTICE && query.partNumber != null) {
      const selectedParts = attempt.selectedParts || [];
      if (!selectedParts.includes(query.partNumber)) {
        throw new BadRequestException({
          errorCode: 'ERR_PART_NOT_IN_ATTEMPT',
          message: `Part ${query.partNumber} không nằm trong danh sách các phần được chọn làm bài của lượt thi này`,
        });
      }
    }

    // PMR 022: Truy vấn snapshot trực tiếp qua Repository
    const snapshot = await this.examAttemptSnapshotRepository.findOne({
      where: { attemptId },
    });

    if (!snapshot) {
      throw new NotFoundException({
        errorCode: 'ERR_SNAPSHOT_NOT_FOUND',
        message: 'Không tìm thấy bản đóng băng đề thi của lượt này',
      });
    }

    // Lọc theo partNumber nếu có
    const rawQuestions = (
      (snapshot.shuffledQuestions || []) as unknown as SnapshotQuestion[]
    ).filter((q) => query.partNumber == null || q.partNumber === query.partNumber);

    // Nạp lại các câu trả lời của lượt thi
    const savedAnswers = await this.examAttemptAnswerRepository.find({
      where: { attemptId },
    });
    const answerMap = new Map<string, ExamAttemptAnswer>();
    for (const ans of savedAnswers) {
      answerMap.set(ans.questionId, ans);
    }

    // PMR 022: Thuật toán deduplicate questionGroups dùng Map
    const groupMap = new Map<string, QuestionGroupDeliveryDto>();
    const questions: QuestionDeliveryItemDto[] = [];

    for (const q of rawQuestions) {
      if (q.questionGroup && q.questionGroup.id) {
        if (!groupMap.has(q.questionGroup.id)) {
          groupMap.set(q.questionGroup.id, {
            id: q.questionGroup.id,
            passageText: q.questionGroup.passageText ?? q.questionGroup.context ?? null,
            audioUrl: q.questionGroup.audioUrl ?? null,
            imageUrl: q.questionGroup.imageUrl ?? null,
          });
        }
      }

      const ans = answerMap.get(q.id);

      questions.push({
        id: q.id,
        partNumber: q.partNumber,
        orderIndex: q.orderIndex,
        originalQuestionNumber: q.originalQuestionNumber,
        questionGroupId: q.questionGroupId ?? null,
        content: q.content ?? null,
        audioUrl: q.audioUrl ?? null,
        imageUrl: q.imageUrl ?? null,
        options: (q.options || []).map((opt) => ({
          id: opt.id,
          label: opt.label,
          content: opt.content ?? null,
        })),
        selectedOptionId: ans?.selectedOptionId ?? null,
        isMarkedForReview: ans?.isMarkedForReview ?? false,
      });
    }

    const response = new ExamAttemptQuestionsResponseDto();
    response.attemptId = attempt.id;
    response.partNumber = query.partNumber ?? null;
    response.totalQuestionsInPart = questions.length;
    response.questionGroups = Array.from(groupMap.values());
    response.questions = questions;

    return response;
  }
}
