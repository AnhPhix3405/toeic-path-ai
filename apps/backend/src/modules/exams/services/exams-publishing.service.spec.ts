import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ExamsPublishingService } from './exams-publishing.service';
import { Exam } from '../entities/exam.entity';
import { ExamType } from '../enums/exam-type.enum';
import { ExamStatus } from '../enums/exam-status.enum';
import { QuestionStatus } from '../../questions/enums/question-status.enum';
import { MediaResourceType } from '../../questions/enums/media-resource-type.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';

describe('ExamsPublishingService', () => {
  let service: ExamsPublishingService;
  let examRepo: Partial<Record<keyof Repository<Exam>, jest.Mock>>;
  let dataSource: { transaction: jest.Mock };

  const mockTeacher: AuthenticatedUser = {
    id: '10000000-0000-4000-8000-000000000001',
    email: 'teacher@example.com',
    role: UserRole.TEACHER,
  };

  const mockOtherTeacher: AuthenticatedUser = {
    id: '10000000-0000-4000-8000-000000000002',
    email: 'other@example.com',
    role: UserRole.TEACHER,
  };

  const createValidQuestion = (partNumber: number, orderIndex: number) => ({
    id: `q-uuid-${orderIndex}`,
    orderIndex,
    question: {
      id: `q-${orderIndex}`,
      status: QuestionStatus.PUBLISHED,
      options: [
        { id: `opt-1-${orderIndex}`, isCorrect: true },
        { id: `opt-2-${orderIndex}`, isCorrect: false },
      ],
      mediaResources:
        partNumber === 1
          ? [
              {
                resourceType: MediaResourceType.IMAGE,
                fileUrl: 'https://cdn/img.png',
                isDeleted: false,
              },
              {
                resourceType: MediaResourceType.AUDIO,
                fileUrl: 'https://cdn/audio.mp3',
                isDeleted: false,
              },
            ]
          : partNumber === 2
            ? [
                {
                  resourceType: MediaResourceType.AUDIO,
                  fileUrl: 'https://cdn/audio.mp3',
                  isDeleted: false,
                },
              ]
            : [],
      questionGroup:
        partNumber === 3 || partNumber === 4
          ? {
              id: `g-${orderIndex}`,
              context: 'Dialogue context',
              mediaResources: [
                {
                  resourceType: MediaResourceType.AUDIO,
                  fileUrl: 'https://cdn/audio.mp3',
                  isDeleted: false,
                },
              ],
            }
          : partNumber === 6 || partNumber === 7
            ? {
                id: `g-${orderIndex}`,
                context: 'Reading passage text here...',
                mediaResources: [],
              }
            : null,
    },
    section: {
      part: { partNumber },
    },
  });

  beforeEach(() => {
    examRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn((cb) =>
        cb({
          findOne: examRepo.findOne,
          save: jest.fn((entityClass, entity) => examRepo.save(entity ?? entityClass)),
        }),
      ),
    };

    service = new ExamsPublishingService(
      examRepo as unknown as Repository<Exam>,
      dataSource as unknown as DataSource,
    );
  });

  describe('validatePublishChecklist', () => {
    it('should fail if full_test has fewer than 200 questions', async () => {
      const exam = {
        id: 'exam-1',
        type: ExamType.FULL_TEST,
        status: ExamStatus.DRAFT,
        sections: [],
        questions: Array.from({ length: 199 }, (_, i) => createValidQuestion(1, i + 1)),
      } as unknown as Exam;

      await expect(service.validatePublishChecklist(exam)).rejects.toThrow(BadRequestException);
    });

    it('should fail if placement_test has no reading section', async () => {
      const exam = {
        id: 'exam-1',
        type: ExamType.PLACEMENT_TEST,
        status: ExamStatus.DRAFT,
        sections: [],
        questions: Array.from({ length: 30 }, (_, i) => createValidQuestion(1, i + 1)),
      } as unknown as Exam;

      await expect(service.validatePublishChecklist(exam)).rejects.toThrow(BadRequestException);
    });

    it('should fail if a question in the exam is still in draft in the bank', async () => {
      const q = createValidQuestion(1, 1);
      q.question.status = QuestionStatus.DRAFT;

      const exam = {
        id: 'exam-1',
        type: ExamType.MINI_TEST,
        status: ExamStatus.DRAFT,
        sections: [{ part: { partNumber: 1 }, targetQuestionsCount: 1 }],
        questions: [q],
      } as unknown as Exam;

      await expect(service.validatePublishChecklist(exam)).rejects.toThrow(BadRequestException);
    });

    it('should fail if Part 1 question is missing audio (even if image exists)', async () => {
      const q = createValidQuestion(1, 1);
      // Remove audio from part 1
      q.question.mediaResources = [
        { resourceType: MediaResourceType.IMAGE, fileUrl: 'https://cdn/img.png', isDeleted: false },
      ];

      const exam = {
        id: 'exam-1',
        type: ExamType.MINI_TEST,
        status: ExamStatus.DRAFT,
        sections: [{ part: { partNumber: 1 }, targetQuestionsCount: 1 }],
        questions: [q],
      } as unknown as Exam;

      await expect(service.validatePublishChecklist(exam)).rejects.toThrow(BadRequestException);
    });

    it('should fail if Part 6 or 7 group has empty context', async () => {
      const q = createValidQuestion(7, 1);
      q.question.questionGroup!.context = '   ';

      const exam = {
        id: 'exam-1',
        type: ExamType.MINI_TEST,
        status: ExamStatus.DRAFT,
        sections: [{ part: { partNumber: 7 }, targetQuestionsCount: 1 }],
        questions: [q],
      } as unknown as Exam;

      await expect(service.validatePublishChecklist(exam)).rejects.toThrow(BadRequestException);
    });

    it('should fail if Single Choice Invariant is violated (no correct option or 2 correct options)', async () => {
      const q = createValidQuestion(5, 1);
      q.question.options = [
        { id: '1', isCorrect: false },
        { id: '2', isCorrect: false },
      ];

      const exam = {
        id: 'exam-1',
        type: ExamType.MINI_TEST,
        status: ExamStatus.DRAFT,
        sections: [{ part: { partNumber: 5 }, targetQuestionsCount: 1 }],
        questions: [q],
      } as unknown as Exam;

      await expect(service.validatePublishChecklist(exam)).rejects.toThrow(BadRequestException);
    });

    it('should fail if orderIndex is discontinuous', async () => {
      const q1 = createValidQuestion(5, 1);
      const q2 = createValidQuestion(5, 3); // gap at 2

      const exam = {
        id: 'exam-1',
        type: ExamType.MINI_TEST,
        status: ExamStatus.DRAFT,
        sections: [{ part: { partNumber: 5 }, targetQuestionsCount: 2 }],
        questions: [q1, q2],
      } as unknown as Exam;

      await expect(service.validatePublishChecklist(exam)).rejects.toThrow(BadRequestException);
    });

    it('should fail if closeAt <= openAt or closeAt <= now', async () => {
      const q1 = createValidQuestion(5, 1);
      const exam = {
        id: 'exam-1',
        type: ExamType.MINI_TEST,
        status: ExamStatus.DRAFT,
        openAt: new Date('2026-10-25T10:00:00Z'),
        closeAt: new Date('2026-10-25T09:00:00Z'),
        sections: [{ part: { partNumber: 5 }, targetQuestionsCount: 1 }],
        questions: [q1],
      } as unknown as Exam;

      await expect(service.validatePublishChecklist(exam)).rejects.toThrow(BadRequestException);
    });

    it('should pass if all checklist rules are satisfied', async () => {
      const q1 = createValidQuestion(5, 1);
      const exam = {
        id: 'exam-1',
        type: ExamType.MINI_TEST,
        status: ExamStatus.DRAFT,
        sections: [{ part: { partNumber: 5 }, targetQuestionsCount: 1 }],
        questions: [q1],
      } as unknown as Exam;

      await expect(service.validatePublishChecklist(exam)).resolves.not.toThrow();
    });
  });

  describe('publish', () => {
    it('should throw ForbiddenException if user is not creator and not admin', async () => {
      examRepo.findOne!.mockResolvedValue({
        id: 'exam-1',
        createdBy: mockTeacher.id,
        isDeleted: false,
      });

      await expect(service.publish('exam-1', { version: 1 }, mockOtherTeacher)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if exam is not in draft status', async () => {
      examRepo.findOne!.mockResolvedValue({
        id: 'exam-1',
        status: ExamStatus.PUBLISHED,
        createdBy: mockTeacher.id,
        version: 1,
        isDeleted: false,
      });

      await expect(service.publish('exam-1', { version: 1 }, mockTeacher)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if version does not match', async () => {
      examRepo.findOne!.mockResolvedValue({
        id: 'exam-1',
        status: ExamStatus.DRAFT,
        createdBy: mockTeacher.id,
        version: 2,
        isDeleted: false,
      });

      await expect(service.publish('exam-1', { version: 1 }, mockTeacher)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should successfully publish and calculate isScheduled when openAt is in the future', async () => {
      const validQ = createValidQuestion(5, 1);
      const exam = {
        id: 'exam-1',
        title: 'Mini Test',
        type: ExamType.MINI_TEST,
        status: ExamStatus.DRAFT,
        createdBy: mockTeacher.id,
        version: 1,
        openAt: new Date('2099-01-01T08:00:00Z'),
        closeAt: new Date('2099-01-02T08:00:00Z'),
        sections: [{ part: { partNumber: 5 }, targetQuestionsCount: 1 }],
        questions: [validQ],
        isDeleted: false,
      };

      examRepo.findOne!.mockResolvedValue(exam);
      examRepo.save!.mockImplementation((val) => Promise.resolve(val));

      const result = await service.publish('exam-1', { version: 1 }, mockTeacher);

      expect(result.status).toBe(ExamStatus.PUBLISHED);
      expect(result.version).toBe(2);
      expect(result.isScheduled).toBe(true);
      expect(result.publishedAt).toBeInstanceOf(Date);
    });
  });

  describe('unpublish (Unpublish Guard)', () => {
    it('should reject unpublish if exam is not in published status', async () => {
      examRepo.findOne!.mockResolvedValue({
        id: 'exam-1',
        status: ExamStatus.DRAFT,
        createdBy: mockTeacher.id,
        version: 1,
        isDeleted: false,
      });

      await expect(service.unpublish('exam-1', { version: 1 }, mockTeacher)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException ERR_EXAM_HAS_ATTEMPTS if exam has attempts', async () => {
      examRepo.findOne!.mockResolvedValue({
        id: 'exam-1',
        status: ExamStatus.PUBLISHED,
        createdBy: mockTeacher.id,
        version: 1,
        isDeleted: false,
      });

      // Spy on getAttemptsCount
      jest.spyOn(service as any, 'getAttemptsCount').mockResolvedValue(5);

      await expect(service.unpublish('exam-1', { version: 1 }, mockTeacher)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should successfully unpublish back to draft when attemptsCount === 0', async () => {
      const exam = {
        id: 'exam-1',
        title: 'Mini Test',
        status: ExamStatus.PUBLISHED,
        publishedAt: new Date(),
        createdBy: mockTeacher.id,
        version: 2,
        isDeleted: false,
      };

      examRepo.findOne!.mockResolvedValue(exam);
      examRepo.save!.mockImplementation((val) => Promise.resolve(val));
      jest.spyOn(service as any, 'getAttemptsCount').mockResolvedValue(0);

      const result = await service.unpublish('exam-1', { version: 2 }, mockTeacher);

      expect(result.status).toBe(ExamStatus.DRAFT);
      expect(result.publishedAt).toBeNull();
      expect(result.version).toBe(3);
      expect(result.isScheduled).toBe(false);
    });
  });

  describe('close & archive', () => {
    it('should close published exam', async () => {
      const exam = {
        id: 'exam-1',
        title: 'Test',
        status: ExamStatus.PUBLISHED,
        createdBy: mockTeacher.id,
        version: 1,
        isDeleted: false,
      };

      examRepo.findOne!.mockResolvedValue(exam);
      examRepo.save!.mockImplementation((val) => Promise.resolve(val));

      const result = await service.close('exam-1', { version: 1 }, mockTeacher);
      expect(result.status).toBe(ExamStatus.CLOSED);
      expect(result.version).toBe(2);
    });

    it('should archive closed exam', async () => {
      const exam = {
        id: 'exam-1',
        title: 'Test',
        status: ExamStatus.CLOSED,
        createdBy: mockTeacher.id,
        version: 2,
        isDeleted: false,
      };

      examRepo.findOne!.mockResolvedValue(exam);
      examRepo.save!.mockImplementation((val) => Promise.resolve(val));

      const result = await service.archive('exam-1', { version: 2 }, mockTeacher);
      expect(result.status).toBe(ExamStatus.ARCHIVED);
      expect(result.version).toBe(3);
    });

    it('should reject archiving directly from published without closing first', async () => {
      const exam = {
        id: 'exam-1',
        title: 'Test',
        status: ExamStatus.PUBLISHED,
        createdBy: mockTeacher.id,
        version: 1,
        isDeleted: false,
      };

      examRepo.findOne!.mockResolvedValue(exam);

      await expect(service.archive('exam-1', { version: 1 }, mockTeacher)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleScheduledExamClosure (Cronjob)', () => {
    it('should execute single SQL update and return closed count', async () => {
      const updateQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };

      examRepo.createQueryBuilder!.mockReturnValue(updateQueryBuilder);

      const affected = await service.handleScheduledExamClosure();
      expect(affected).toBe(3);
      expect(updateQueryBuilder.update).toHaveBeenCalled();
      expect(updateQueryBuilder.execute).toHaveBeenCalled();
    });
  });
});
