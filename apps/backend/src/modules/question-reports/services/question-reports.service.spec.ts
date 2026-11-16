import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ExamAttemptSnapshot } from '../../exam-attempts/entities/exam-attempt-snapshot.entity';
import { ExamAttempt } from '../../exam-attempts/entities/exam-attempt.entity';
import { ExamAttemptStatus } from '../../exam-attempts/enums/exam-attempt-status.enum';
import { MediaResourceType } from '../../questions/enums/media-resource-type.enum';
import { QuestionStatus } from '../../questions/enums/question-status.enum';
import { QuestionType } from '../../questions/enums/question-type.enum';
import { Question } from '../../questions/entities/question.entity';
import { CreateQuestionReportDto } from '../dto/request/create-question-report.dto';
import { QueryMyQuestionReportsDto } from '../dto/request/query-my-question-reports.dto';
import { QueryQuestionReportsDto } from '../dto/request/query-question-reports.dto';
import { ResolveQuestionReportDto } from '../dto/request/resolve-question-report.dto';
import { QuestionReport } from '../entities/question-report.entity';
import { QuestionReportReason } from '../enums/question-report-reason.enum';
import { QuestionReportStatus } from '../enums/question-report-status.enum';
import { QuestionReportsService } from './question-reports.service';

describe('QuestionReportsService (UC29 & UC49)', () => {
  let service: QuestionReportsService;
  let reportRepoMock: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let questionRepoMock: {
    findOne: jest.Mock;
  };
  let attemptRepoMock: {
    findOne: jest.Mock;
  };
  let snapshotRepoMock: {
    findOne: jest.Mock;
  };
  let dataSourceMock: {
    transaction: jest.Mock;
  };

  beforeEach(() => {
    reportRepoMock = {
      create: jest.fn((data: Partial<QuestionReport>) => ({
        id: 'rep-1',
        status: QuestionReportStatus.PENDING,
        createdAt: new Date('2026-11-16T08:00:00.000Z'),
        updatedAt: new Date('2026-11-16T08:00:00.000Z'),
        resolvedAt: null,
        resolvedById: null,
        resolutionNote: null,
        ...data,
      })),
      save: jest.fn(async (entity: QuestionReport) => entity),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    questionRepoMock = {
      findOne: jest.fn(),
    };

    attemptRepoMock = {
      findOne: jest.fn(),
    };

    snapshotRepoMock = {
      findOne: jest.fn(),
    };

    dataSourceMock = {
      transaction: jest.fn(),
    };

    service = new QuestionReportsService(
      reportRepoMock as unknown as Repository<QuestionReport>,
      questionRepoMock as unknown as Repository<Question>,
      attemptRepoMock as unknown as Repository<ExamAttempt>,
      snapshotRepoMock as unknown as Repository<ExamAttemptSnapshot>,
      dataSourceMock as unknown as DataSource,
    );
  });

  describe('createReport (UC29)', () => {
    it('should create report when no attemptId is provided and question exists', async () => {
      questionRepoMock.findOne.mockResolvedValue({ id: 'q-1' });

      const dto: CreateQuestionReportDto = {
        reason: QuestionReportReason.WRONG_ANSWER,
        description: 'Đáp án A mới đúng',
      };

      const res = await service.createReport('user-1', 'q-1', dto);

      expect(questionRepoMock.findOne).toHaveBeenCalledWith({
        where: { id: 'q-1' },
        select: { id: true },
      });
      expect(res).toMatchObject({
        id: 'rep-1',
        questionId: 'q-1',
        attemptId: null,
        reason: QuestionReportReason.WRONG_ANSWER,
        description: 'Đáp án A mới đúng',
        status: QuestionReportStatus.PENDING,
      });
    });

    it('should throw NotFoundException (ERR_QUESTION_NOT_FOUND) when no attemptId and question does not exist', async () => {
      questionRepoMock.findOne.mockResolvedValue(null);

      await expect(
        service.createReport('user-1', 'q-missing', {
          reason: QuestionReportReason.TYPO_ERROR,
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createReport('user-1', 'q-missing', {
          reason: QuestionReportReason.TYPO_ERROR,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: 'ERR_QUESTION_NOT_FOUND' }),
      });
    });

    it('should validate attemptId context (404, 403, 400 not submitted, 400 question not in snapshot) and allow reporting question in snapshot without querying questions table (PMR 028)', async () => {
      const dto: CreateQuestionReportDto = {
        reason: QuestionReportReason.BROKEN_MEDIA,
        attemptId: 'att-1',
      };

      // 1. Attempt not found
      attemptRepoMock.findOne.mockResolvedValueOnce(null);
      await expect(service.createReport('user-1', 'q-1', dto)).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: 'ERR_ATTEMPT_NOT_FOUND' }),
      });

      // 2. Forbidden (not owner)
      attemptRepoMock.findOne.mockResolvedValueOnce({
        id: 'att-1',
        userId: 'other-user',
        status: ExamAttemptStatus.SUBMITTED,
      });
      await expect(service.createReport('user-1', 'q-1', dto)).rejects.toThrow(ForbiddenException);

      // 3. Not submitted (in_progress)
      attemptRepoMock.findOne.mockResolvedValueOnce({
        id: 'att-1',
        userId: 'user-1',
        status: ExamAttemptStatus.IN_PROGRESS,
      });
      await expect(service.createReport('user-1', 'q-1', dto)).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: 'ERR_ATTEMPT_NOT_SUBMITTED' }),
      });

      // 4. Question not in attempt snapshot
      attemptRepoMock.findOne.mockResolvedValueOnce({
        id: 'att-1',
        userId: 'user-1',
        status: ExamAttemptStatus.SUBMITTED,
      });
      snapshotRepoMock.findOne.mockResolvedValueOnce({
        attemptId: 'att-1',
        shuffledQuestions: [{ id: 'q-other' }],
      });
      await expect(service.createReport('user-1', 'q-1', dto)).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: 'ERR_QUESTION_NOT_IN_ATTEMPT' }),
      });

      // 5. Valid in snapshot -> succeeds without calling questionRepo.findOne
      attemptRepoMock.findOne.mockResolvedValueOnce({
        id: 'att-1',
        userId: 'user-1',
        status: ExamAttemptStatus.TIMED_OUT,
      });
      snapshotRepoMock.findOne.mockResolvedValueOnce({
        attemptId: 'att-1',
        shuffledQuestions: [{ id: 'q-1' }],
      });

      const res = await service.createReport('user-1', 'q-1', dto);
      expect(questionRepoMock.findOne).not.toHaveBeenCalled();
      expect(res.attemptId).toBe('att-1');
    });

    it('should catch PostgreSQL 23505 unique violation from uq_reporter_open_question_report and throw 409 ConflictException (ERR_DUPLICATE_OPEN_REPORT) (PMR 028)', async () => {
      questionRepoMock.findOne.mockResolvedValue({ id: 'q-1' });
      reportRepoMock.save.mockRejectedValue({
        driverError: { code: '23505' },
      });

      await expect(
        service.createReport('user-1', 'q-1', {
          reason: QuestionReportReason.WRONG_ANSWER,
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.createReport('user-1', 'q-1', {
          reason: QuestionReportReason.WRONG_ANSWER,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: 'ERR_DUPLICATE_OPEN_REPORT' }),
      });
    });
  });

  describe('getMyReports (UC29)', () => {
    it('should return flat paginated reports for reporterId=userId and hide resolvedBy/resolvedById (PMR 025 & PMR 028)', async () => {
      reportRepoMock.findAndCount.mockResolvedValue([
        [
          {
            id: 'rep-1',
            questionId: 'q-1',
            reporterId: 'user-1',
            attemptId: 'att-1',
            reason: QuestionReportReason.WRONG_ANSWER,
            description: 'Sai đáp án',
            status: QuestionReportStatus.RESOLVED,
            resolvedById: 'teacher-secret-id',
            resolvedBy: { id: 'teacher-secret-id', email: 'teacher@example.com' },
            resolvedAt: new Date('2026-11-16T09:00:00.000Z'),
            resolutionNote: 'Đã sửa lại đáp án B.',
            createdAt: new Date('2026-11-16T08:00:00.000Z'),
            updatedAt: new Date('2026-11-16T09:00:00.000Z'),
          },
        ],
        1,
      ]);

      const query: QueryMyQuestionReportsDto = {
        page: 1,
        limit: 10,
        status: QuestionReportStatus.RESOLVED,
      };

      const res = await service.getMyReports('user-1', query);

      expect(reportRepoMock.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            reporterId: 'user-1',
            status: QuestionReportStatus.RESOLVED,
          },
        }),
      );
      expect(res.total).toBe(1);
      expect(res.items[0].resolutionNote).toBe('Đã sửa lại đáp án B.');
      expect(res.items[0]).not.toHaveProperty('resolvedById');
      expect(res.items[0]).not.toHaveProperty('resolvedBy');
    });
  });

  describe('getReportsForManagement & getReportDetail (UC49)', () => {
    it('should filter management list by status, reason, questionId without filtering question.isDeleted (PMR 031)', async () => {
      const qbMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 'rep-1',
              questionId: 'q-1',
              reporterId: 'user-1',
              reporter: { id: 'user-1', email: 'student@example.com' },
              question: {
                id: 'q-1',
                content: null,
                part: { partNumber: 1 },
              },
              attemptId: null,
              reason: QuestionReportReason.BROKEN_MEDIA,
              description: null,
              status: QuestionReportStatus.PENDING,
              resolvedById: null,
              resolvedAt: null,
              resolutionNote: null,
              createdAt: new Date('2026-11-16T08:00:00.000Z'),
              updatedAt: new Date('2026-11-16T08:00:00.000Z'),
            },
          ],
          1,
        ]),
      };
      reportRepoMock.createQueryBuilder.mockReturnValue(qbMock);

      const query: QueryQuestionReportsDto = {
        page: 1,
        limit: 20,
        status: QuestionReportStatus.PENDING,
        reason: QuestionReportReason.BROKEN_MEDIA,
        questionId: 'q-1',
      };

      const res = await service.getReportsForManagement(query);

      expect(res.total).toBe(1);
      expect(res.items[0].partNumber).toBe(1);
      expect(res.items[0].questionContent).toBeNull();
      expect(res.items[0].reporterEmail).toBe('student@example.com');
    });

    it('should return full QuestionReportDetailResponseDto with sorted options, active mediaResources (isDeleted=false), questionGroup context, and Rule #1002 nullable content (PMR 028 & PMR 031)', async () => {
      reportRepoMock.findOne.mockResolvedValueOnce(null);
      await expect(service.getReportDetail('rep-missing')).rejects.toThrow(NotFoundException);

      reportRepoMock.findOne.mockResolvedValueOnce({
        id: 'rep-1',
        questionId: 'q-1',
        reporterId: 'user-1',
        reporter: { id: 'user-1', email: 'student@example.com' },
        attemptId: 'att-1',
        reason: QuestionReportReason.UNCLEAR_EXPLANATION,
        description: 'Giải thích chưa rõ',
        status: QuestionReportStatus.IN_REVIEW,
        resolvedById: null,
        resolvedBy: null,
        resolvedAt: null,
        resolutionNote: null,
        createdAt: new Date('2026-11-16T08:00:00.000Z'),
        updatedAt: new Date('2026-11-16T08:10:00.000Z'),
        question: {
          id: 'q-1',
          content: null,
          questionType: QuestionType.SINGLE_CHOICE,
          status: QuestionStatus.PUBLISHED,
          explanation: 'Giải thích chi tiết câu 32',
          part: { partNumber: 3 },
          mediaResources: [
            {
              fileUrl: 'https://cdn/deleted.mp3',
              resourceType: MediaResourceType.AUDIO,
              isDeleted: true,
            },
          ],
          options: [
            { id: 'opt-2', label: 'B', content: 'At 2 PM', isCorrect: true, position: 2 },
            { id: 'opt-1', label: 'A', content: null, isCorrect: false, position: 1 },
          ],
          questionGroup: {
            id: 'grp-1',
            title: 'Questions 32-34',
            context: 'W: When does the meeting start? M: At 2 PM.',
            mediaResources: [
              {
                fileUrl: 'https://cdn/group-audio.mp3',
                resourceType: MediaResourceType.AUDIO,
                isDeleted: false,
              },
              {
                fileUrl: 'https://cdn/group-deleted.png',
                resourceType: MediaResourceType.IMAGE,
                isDeleted: true,
              },
            ],
          },
        },
      });

      const detail = await service.getReportDetail('rep-1');

      expect(detail.question.content).toBeNull();
      expect(detail.question.audioUrl).toBeNull(); // deleted media filtered out
      expect(detail.question.options.map((o) => o.label)).toEqual(['A', 'B']);
      expect(detail.question.options[0].content).toBeNull();
      expect(detail.question.questionGroup).toEqual({
        id: 'grp-1',
        title: 'Questions 32-34',
        passageText: 'W: When does the meeting start? M: At 2 PM.',
        audioUrl: 'https://cdn/group-audio.mp3',
        imageUrl: null,
        transcript: 'W: When does the meeting start? M: At 2 PM.',
      });
    });
  });

  describe('resolveReport (UC49)', () => {
    it('should transition pending -> in_review keeping resolvedById=null and resolvedAt=null, and reject in_review -> in_review with 400 ERR_INVALID_REPORT_STATUS_TRANSITION (PMR 028)', async () => {
      // Case 1: pending -> in_review succeeds
      const updateQbSuccess = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          affected: 1,
          raw: [
            {
              id: 'rep-1',
              question_id: 'q-1',
              status: QuestionReportStatus.IN_REVIEW,
              resolved_by: null,
              resolved_at: null,
              resolution_note: null,
            },
          ],
        }),
      };

      dataSourceMock.transaction.mockImplementationOnce(async (cb: (m: unknown) => unknown) =>
        cb({
          createQueryBuilder: () => updateQbSuccess,
          getRepository: () => ({ findOne: jest.fn() }),
        }),
      );

      const res = await service.resolveReport('teacher-1', 'rep-1', {
        status: QuestionReportStatus.IN_REVIEW,
      });

      expect(res.status).toBe(QuestionReportStatus.IN_REVIEW);
      expect(res.resolvedById).toBeNull();
      expect(res.resolvedAt).toBeNull();
      expect(res.bulkResolvedCount).toBe(0);

      // Case 2: already in_review -> 400 ERR_INVALID_REPORT_STATUS_TRANSITION
      const updateQbZero = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0, raw: [] }),
      };

      dataSourceMock.transaction.mockImplementationOnce(async (cb: (m: unknown) => unknown) =>
        cb({
          createQueryBuilder: () => updateQbZero,
          getRepository: () => ({
            findOne: jest.fn().mockResolvedValue({
              id: 'rep-1',
              status: QuestionReportStatus.IN_REVIEW,
            }),
          }),
        }),
      );

      await expect(
        service.resolveReport('teacher-1', 'rep-1', {
          status: QuestionReportStatus.IN_REVIEW,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'ERR_INVALID_REPORT_STATUS_TRANSITION',
        }),
      });
    });

    it('should resolve report with shared now timestamp, close sibling open reports when resolveAllForQuestion=true, and reject already closed reports with 400 ERR_REPORT_ALREADY_CLOSED (PMR 028 & PMR 031)', async () => {
      const setCalls: Array<Record<string, unknown>> = [];
      let callCount = 0;

      const updateQb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn((payload: Record<string, unknown>) => {
          setCalls.push(payload);
          return updateQb;
        }),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn(async () => {
          callCount++;
          if (callCount === 1) {
            return {
              affected: 1,
              raw: [
                {
                  id: 'rep-1',
                  question_id: 'q-1',
                  status: QuestionReportStatus.RESOLVED,
                  resolved_by: 'teacher-1',
                  resolved_at: setCalls[0].resolvedAt,
                  resolution_note: 'Đã cập nhật đáp án đúng cho câu hỏi.',
                },
              ],
            };
          }
          // Bulk update of sibling open reports (id != :id)
          return { affected: 4 };
        }),
      };

      dataSourceMock.transaction.mockImplementationOnce(async (cb: (m: unknown) => unknown) =>
        cb({
          createQueryBuilder: () => updateQb,
          getRepository: () => ({ findOne: jest.fn() }),
        }),
      );

      const dto: ResolveQuestionReportDto = {
        status: QuestionReportStatus.RESOLVED,
        resolutionNote: 'Đã cập nhật đáp án đúng cho câu hỏi.',
        resolveAllForQuestion: true,
      };

      const res = await service.resolveReport('teacher-1', 'rep-1', dto);

      expect(res.status).toBe(QuestionReportStatus.RESOLVED);
      expect(res.resolvedById).toBe('teacher-1');
      expect(res.resolvedAt).toBeInstanceOf(Date);
      expect(res.bulkResolvedCount).toBe(4);
      // Both primary and bulk update must share the exact same `now` Date instance (PMR 031)
      expect(setCalls).toHaveLength(2);
      expect(setCalls[0].resolvedAt).toBe(setCalls[1].resolvedAt);

      // Already closed report -> 400 ERR_REPORT_ALREADY_CLOSED
      const closedQb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0, raw: [] }),
      };

      dataSourceMock.transaction.mockImplementationOnce(async (cb: (m: unknown) => unknown) =>
        cb({
          createQueryBuilder: () => closedQb,
          getRepository: () => ({
            findOne: jest.fn().mockResolvedValue({
              id: 'rep-1',
              status: QuestionReportStatus.RESOLVED,
            }),
          }),
        }),
      );

      await expect(service.resolveReport('teacher-2', 'rep-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      dataSourceMock.transaction.mockImplementationOnce(async (cb: (m: unknown) => unknown) =>
        cb({
          createQueryBuilder: () => closedQb,
          getRepository: () => ({
            findOne: jest.fn().mockResolvedValue({
              id: 'rep-1',
              status: QuestionReportStatus.REJECTED,
            }),
          }),
        }),
      );
      await expect(service.resolveReport('teacher-2', 'rep-1', dto)).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: 'ERR_REPORT_ALREADY_CLOSED' }),
      });
    });
  });
});
