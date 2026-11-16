import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { ExamAttemptSnapshot } from '../../exam-attempts/entities/exam-attempt-snapshot.entity';
import { ExamAttempt } from '../../exam-attempts/entities/exam-attempt.entity';
import { ExamAttemptStatus } from '../../exam-attempts/enums/exam-attempt-status.enum';
import { MediaResource } from '../../questions/entities/media-resource.entity';
import { Question } from '../../questions/entities/question.entity';
import { MediaResourceType } from '../../questions/enums/media-resource-type.enum';
import { CreateQuestionReportDto } from '../dto/request/create-question-report.dto';
import { QueryMyQuestionReportsDto } from '../dto/request/query-my-question-reports.dto';
import { QueryQuestionReportsDto } from '../dto/request/query-question-reports.dto';
import { ResolveQuestionReportDto } from '../dto/request/resolve-question-report.dto';
import {
  QuestionReportDetailResponseDto,
  QuestionReportGroupContextDto,
  QuestionReportOptionContextDto,
  QuestionReportQuestionContextDto,
} from '../dto/response/question-report-detail-response.dto';
import {
  AdminQuestionReportItemDto,
  MyQuestionReportItemDto,
  PaginatedAdminQuestionReportsResponseDto,
  PaginatedMyQuestionReportsResponseDto,
  ResolveQuestionReportResponseDto,
} from '../dto/response/question-report-item-response.dto';
import { QuestionReport } from '../entities/question-report.entity';
import { QuestionReportStatus } from '../enums/question-report-status.enum';

@Injectable()
export class QuestionReportsService {
  constructor(
    @InjectRepository(QuestionReport)
    private readonly questionReportRepository: Repository<QuestionReport>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(ExamAttempt)
    private readonly examAttemptRepository: Repository<ExamAttempt>,
    @InjectRepository(ExamAttemptSnapshot)
    private readonly examAttemptSnapshotRepository: Repository<ExamAttemptSnapshot>,
    private readonly dataSource: DataSource,
  ) {}

  async createReport(
    userId: string,
    questionId: string,
    dto: CreateQuestionReportDto,
  ): Promise<MyQuestionReportItemDto> {
    if (dto.attemptId) {
      const attempt = await this.examAttemptRepository.findOne({
        where: { id: dto.attemptId },
      });

      if (!attempt) {
        throw new NotFoundException({
          errorCode: 'ERR_ATTEMPT_NOT_FOUND',
          message: 'Không tìm thấy lượt làm bài thi',
        });
      }

      if (attempt.userId !== userId) {
        throw new ForbiddenException({
          errorCode: 'ERR_FORBIDDEN_ATTEMPT_ACCESS',
          message: 'Bạn không có quyền báo cáo trên lượt làm bài của người khác',
        });
      }

      if (
        attempt.status !== ExamAttemptStatus.SUBMITTED &&
        attempt.status !== ExamAttemptStatus.TIMED_OUT
      ) {
        throw new BadRequestException({
          errorCode: 'ERR_ATTEMPT_NOT_SUBMITTED',
          message: 'Chỉ được phép gửi báo cáo câu hỏi sau khi lượt thi đã nộp',
        });
      }

      const snapshot = await this.examAttemptSnapshotRepository.findOne({
        where: { attemptId: attempt.id },
        select: { id: true, shuffledQuestions: true },
      });

      const shuffledQuestions = Array.isArray(snapshot?.shuffledQuestions)
        ? snapshot.shuffledQuestions
        : [];
      const existsInAttempt = shuffledQuestions.some(
        (q: Record<string, unknown>) => q.id === questionId,
      );

      if (!existsInAttempt) {
        throw new BadRequestException({
          errorCode: 'ERR_QUESTION_NOT_IN_ATTEMPT',
          message: 'Câu hỏi được báo cáo không nằm trong lượt làm bài thi này',
        });
      }
    } else {
      const question = await this.questionRepository.findOne({
        where: { id: questionId },
        select: { id: true },
      });

      if (!question) {
        throw new NotFoundException({
          errorCode: 'ERR_QUESTION_NOT_FOUND',
          message: 'Không tìm thấy câu hỏi được báo cáo',
        });
      }
    }

    const report = this.questionReportRepository.create({
      questionId,
      reporterId: userId,
      attemptId: dto.attemptId ?? null,
      reason: dto.reason,
      description: dto.description?.trim() ? dto.description.trim() : null,
      status: QuestionReportStatus.PENDING,
    });

    try {
      const saved = await this.questionReportRepository.save(report);
      return this.mapToMyReportItemDto(saved);
    } catch (error: unknown) {
      if (this.isPostgresUniqueViolation(error)) {
        throw new ConflictException({
          errorCode: 'ERR_DUPLICATE_OPEN_REPORT',
          message: 'Bạn đã có một báo cáo đang chờ xử lý cho câu hỏi này',
        });
      }
      throw error;
    }
  }

  async getMyReports(
    userId: string,
    query: QueryMyQuestionReportsDto,
  ): Promise<PaginatedMyQuestionReportsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: FindOptionsWhere<QuestionReport> = {
      reporterId: userId,
    };
    if (query.status) {
      where.status = query.status;
    }

    const [reports, total] = await this.questionReportRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const response = new PaginatedMyQuestionReportsResponseDto();
    response.items = reports.map((r) => this.mapToMyReportItemDto(r));
    response.total = total;
    response.page = page;
    response.limit = limit;
    response.totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return response;
  }

  async getReportsForManagement(
    query: QueryQuestionReportsDto,
  ): Promise<PaginatedAdminQuestionReportsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    // PMR 031: Do NOT filter question.isDeleted = false so teachers can still manage reports on soft-deleted questions
    const qb = this.questionReportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.question', 'question')
      .leftJoinAndSelect('question.part', 'part');

    if (query.status) {
      qb.andWhere('report.status = :status', { status: query.status });
    }
    if (query.reason) {
      qb.andWhere('report.reason = :reason', { reason: query.reason });
    }
    if (query.questionId) {
      qb.andWhere('report.questionId = :questionId', {
        questionId: query.questionId,
      });
    }

    qb.orderBy('report.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [reports, total] = await qb.getManyAndCount();

    const items: AdminQuestionReportItemDto[] = reports.map((report) => ({
      id: report.id,
      questionId: report.questionId,
      reporterId: report.reporterId,
      reporterEmail: report.reporter?.email ?? null,
      attemptId: report.attemptId ?? null,
      partNumber: report.question?.part?.partNumber ?? null,
      questionContent: report.question?.content ?? null,
      reason: report.reason,
      description: report.description ?? null,
      status: report.status,
      resolvedById: report.resolvedById ?? null,
      resolutionNote: report.resolutionNote ?? null,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      resolvedAt: report.resolvedAt ?? null,
    }));

    const response = new PaginatedAdminQuestionReportsResponseDto();
    response.items = items;
    response.total = total;
    response.page = page;
    response.limit = limit;
    response.totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return response;
  }

  async getReportDetail(reportId: string): Promise<QuestionReportDetailResponseDto> {
    // PMR 031: Load full context without filtering isDeleted on questions/question_groups
    const report = await this.questionReportRepository.findOne({
      where: { id: reportId },
      relations: {
        reporter: true,
        resolvedBy: true,
        question: {
          part: true,
          options: true,
          mediaResources: true,
          questionGroup: {
            mediaResources: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException({
        errorCode: 'ERR_REPORT_NOT_FOUND',
        message: 'Không tìm thấy báo cáo câu hỏi',
      });
    }

    const q = report.question;
    const partNumber = q?.part?.partNumber ?? null;
    const isListeningGroup = partNumber === 3 || partNumber === 4;

    // PMR 031: Filter isDeleted = false ONLY on mediaResources
    const activeQuestionMedia = (q?.mediaResources || []).filter((m) => !m.isDeleted);
    const questionAudio = this.findMediaUrl(activeQuestionMedia, MediaResourceType.AUDIO);
    const questionImage = this.findMediaUrl(activeQuestionMedia, MediaResourceType.IMAGE);

    const sortedOptions: QuestionReportOptionContextDto[] = [...(q?.options || [])]
      .sort((a, b) => a.position - b.position)
      .map((opt) => ({
        id: opt.id,
        label: opt.label,
        content: opt.content ?? null,
        isCorrect: opt.isCorrect,
        position: opt.position,
      }));

    let groupDto: QuestionReportGroupContextDto | null = null;
    if (q?.questionGroup) {
      const grp = q.questionGroup as typeof q.questionGroup & {
        transcript?: string | null;
      };
      const activeGroupMedia = (grp.mediaResources || []).filter((m) => !m.isDeleted);
      groupDto = {
        id: grp.id,
        title: grp.title ?? null,
        passageText: grp.context ?? null,
        audioUrl: this.findMediaUrl(activeGroupMedia, MediaResourceType.AUDIO),
        imageUrl: this.findMediaUrl(activeGroupMedia, MediaResourceType.IMAGE),
        transcript: grp.transcript ?? (isListeningGroup ? (grp.context ?? null) : null),
      };
    }

    const questionDto = new QuestionReportQuestionContextDto();
    questionDto.id = q?.id ?? report.questionId;
    questionDto.partNumber = partNumber;
    questionDto.questionType = q?.questionType;
    questionDto.status = q?.status;
    questionDto.content = q?.content ?? null;
    questionDto.explanation = q?.explanation ?? null;
    questionDto.audioUrl = questionAudio;
    questionDto.imageUrl = questionImage;
    questionDto.options = sortedOptions;
    questionDto.questionGroup = groupDto;

    const detail = new QuestionReportDetailResponseDto();
    detail.id = report.id;
    detail.questionId = report.questionId;
    detail.reporterId = report.reporterId;
    detail.reporterEmail = report.reporter?.email ?? null;
    detail.attemptId = report.attemptId ?? null;
    detail.reason = report.reason;
    detail.description = report.description ?? null;
    detail.status = report.status;
    detail.resolvedById = report.resolvedById ?? null;
    detail.resolvedByEmail = report.resolvedBy?.email ?? null;
    detail.resolvedAt = report.resolvedAt ?? null;
    detail.resolutionNote = report.resolutionNote ?? null;
    detail.createdAt = report.createdAt;
    detail.updatedAt = report.updatedAt;
    detail.question = questionDto;

    return detail;
  }

  async resolveReport(
    actorId: string,
    reportId: string,
    dto: ResolveQuestionReportDto,
  ): Promise<ResolveQuestionReportResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      if (dto.status === QuestionReportStatus.IN_REVIEW) {
        // PMR 028: Intermediate state `in_review` only transitions from `pending` and keeps resolvedById/resolvedAt = null
        const updateResult = await manager
          .createQueryBuilder()
          .update(QuestionReport)
          .set({
            status: QuestionReportStatus.IN_REVIEW,
            resolutionNote: dto.resolutionNote?.trim() ? dto.resolutionNote.trim() : null,
          })
          .where('id = :id AND status = :pendingStatus', {
            id: reportId,
            pendingStatus: QuestionReportStatus.PENDING,
          })
          .returning('*')
          .execute();

        if (!updateResult.affected || updateResult.affected === 0) {
          const existing = await manager.getRepository(QuestionReport).findOne({
            where: { id: reportId },
            select: { id: true, status: true },
          });

          if (!existing) {
            throw new NotFoundException({
              errorCode: 'ERR_REPORT_NOT_FOUND',
              message: 'Không tìm thấy báo cáo câu hỏi',
            });
          }

          if (existing.status === QuestionReportStatus.IN_REVIEW) {
            throw new BadRequestException({
              errorCode: 'ERR_INVALID_REPORT_STATUS_TRANSITION',
              message: 'Báo cáo đang ở trạng thái in_review',
            });
          }

          throw new BadRequestException({
            errorCode: 'ERR_REPORT_ALREADY_CLOSED',
            message: 'Báo cáo câu hỏi này đã được đóng trước đó',
          });
        }

        const rawRows = Array.isArray(updateResult.raw)
          ? (updateResult.raw as Array<Record<string, unknown>>)
          : [];
        const rawRow = rawRows[0] ?? {};
        const response = new ResolveQuestionReportResponseDto();
        response.id = reportId;
        response.questionId = (rawRow.question_id as string) ?? (rawRow.questionId as string) ?? '';
        response.status = QuestionReportStatus.IN_REVIEW;
        response.resolvedById = null;
        response.resolvedAt = null;
        response.resolutionNote =
          (rawRow.resolution_note as string | null) ??
          (rawRow.resolutionNote as string | null) ??
          null;
        response.bulkResolvedCount = 0;

        return response;
      }

      // PMR 031: Terminal states `resolved` / `rejected` share a single `now` timestamp
      const now = new Date();
      const trimmedNote = dto.resolutionNote?.trim() ?? null;

      const updateResult = await manager
        .createQueryBuilder()
        .update(QuestionReport)
        .set({
          status: dto.status,
          resolutionNote: trimmedNote,
          resolvedById: actorId,
          resolvedAt: now,
        })
        .where('id = :id AND status IN (:...openStatuses)', {
          id: reportId,
          openStatuses: [QuestionReportStatus.PENDING, QuestionReportStatus.IN_REVIEW],
        })
        .returning('*')
        .execute();

      if (!updateResult.affected || updateResult.affected === 0) {
        const existing = await manager.getRepository(QuestionReport).findOne({
          where: { id: reportId },
          select: { id: true, status: true },
        });

        if (!existing) {
          throw new NotFoundException({
            errorCode: 'ERR_REPORT_NOT_FOUND',
            message: 'Không tìm thấy báo cáo câu hỏi',
          });
        }

        throw new BadRequestException({
          errorCode: 'ERR_REPORT_ALREADY_CLOSED',
          message: 'Báo cáo câu hỏi này đã được đóng trước đó',
        });
      }

      const rawRows = Array.isArray(updateResult.raw)
        ? (updateResult.raw as Array<Record<string, unknown>>)
        : [];
      const rawRow = rawRows[0] ?? {};
      const questionId = (rawRow.question_id as string) ?? (rawRow.questionId as string) ?? '';

      let bulkResolvedCount = 0;
      if (dto.resolveAllForQuestion && questionId) {
        const bulkUpdateResult = await manager
          .createQueryBuilder()
          .update(QuestionReport)
          .set({
            status: dto.status,
            resolutionNote: trimmedNote,
            resolvedById: actorId,
            resolvedAt: now,
          })
          .where('questionId = :questionId AND id != :id AND status IN (:...openStatuses)', {
            questionId,
            id: reportId,
            openStatuses: [QuestionReportStatus.PENDING, QuestionReportStatus.IN_REVIEW],
          })
          .execute();

        bulkResolvedCount = bulkUpdateResult.affected ?? 0;
      }

      const response = new ResolveQuestionReportResponseDto();
      response.id = reportId;
      response.questionId = questionId;
      response.status = dto.status;
      response.resolvedById = actorId;
      response.resolvedAt = now;
      response.resolutionNote = trimmedNote;
      response.bulkResolvedCount = bulkResolvedCount;

      return response;
    });
  }

  private mapToMyReportItemDto(report: QuestionReport): MyQuestionReportItemDto {
    // PMR 025 & PMR 028: Strictly omit resolvedBy / resolvedById for student privacy
    const dto = new MyQuestionReportItemDto();
    dto.id = report.id;
    dto.questionId = report.questionId;
    dto.attemptId = report.attemptId ?? null;
    dto.reason = report.reason;
    dto.description = report.description ?? null;
    dto.status = report.status;
    dto.resolutionNote = report.resolutionNote ?? null;
    dto.createdAt = report.createdAt;
    dto.resolvedAt = report.resolvedAt ?? null;
    return dto;
  }

  private findMediaUrl(mediaList: MediaResource[], type: MediaResourceType): string | null {
    const found = mediaList.find((m) => m.resourceType === type);
    return found?.fileUrl ?? null;
  }

  private isPostgresUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    const errObj = error as {
      code?: string;
      driverError?: { code?: string };
    };
    return errObj.code === '23505' || errObj.driverError?.code === '23505';
  }
}
