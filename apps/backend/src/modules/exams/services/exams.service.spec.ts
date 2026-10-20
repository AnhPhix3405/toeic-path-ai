import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { ExamsService } from './exams.service';
import { Exam } from '../entities/exam.entity';
import { ExamSection } from '../entities/exam-section.entity';
import { ToeicPart } from '../../questions/entities/toeic-part.entity';
import { ExamType } from '../enums/exam-type.enum';
import { ExamStatus } from '../enums/exam-status.enum';
import { ScoreConversionType } from '../enums/score-conversion-type.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';

describe('ExamsService', () => {
  let service: ExamsService;
  let examRepo: jest.Mocked<Repository<Exam>>;
  let sectionRepo: jest.Mocked<Repository<ExamSection>>;
  let partRepo: jest.Mocked<Repository<ToeicPart>>;
  let dataSource: jest.Mocked<DataSource>;
  let mockEntityManager: jest.Mocked<EntityManager>;

  const mockTeacher: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    sessionId: 'sess-1',
    email: 'teacher@test.com',
    role: UserRole.TEACHER,
    status: UserStatus.ACTIVE,
  };

  const mockOtherTeacher: AuthenticatedUser = {
    id: '22222222-2222-2222-2222-222222222222',
    sessionId: 'sess-2',
    email: 'other_teacher@test.com',
    role: UserRole.TEACHER,
    status: UserStatus.ACTIVE,
  };

  const mockAdmin: AuthenticatedUser = {
    id: '33333333-3333-3333-3333-333333333333',
    sessionId: 'sess-3',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  };

  const mockParts: Partial<ToeicPart>[] = [
    { id: 'part-uuid-1', partNumber: 1, name: 'Part 1: Photographs' },
    { id: 'part-uuid-2', partNumber: 2, name: 'Part 2: Question-Response' },
    { id: 'part-uuid-3', partNumber: 3, name: 'Part 3: Conversations' },
    { id: 'part-uuid-4', partNumber: 4, name: 'Part 4: Short Talks' },
    { id: 'part-uuid-5', partNumber: 5, name: 'Part 5: Incomplete Sentences' },
    { id: 'part-uuid-6', partNumber: 6, name: 'Part 6: Text Completion' },
    { id: 'part-uuid-7', partNumber: 7, name: 'Part 7: Reading Comprehension' },
  ];

  beforeEach(() => {
    mockEntityManager = {
      create: jest.fn().mockImplementation((entityClass: any, plain: any) => plain),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    } as any;

    dataSource = {
      transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockEntityManager);
      }),
    } as any;

    examRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    } as any;

    sectionRepo = {
      save: jest.fn(),
      find: jest.fn(),
    } as any;

    partRepo = {
      find: jest.fn(),
    } as any;

    service = new ExamsService(examRepo, sectionRepo, partRepo, dataSource);
  });

  describe('create()', () => {
    it('should throw BadRequestException if closeAt is before or equal to openAt', async () => {
      await expect(
        service.create(
          {
            title: 'Test Exam with Invalid Dates',
            type: ExamType.FULL_TEST,
            durationMinutes: 120,
            openAt: '2026-10-25T10:00:00.000Z',
            closeAt: '2026-10-25T09:00:00.000Z',
          },
          mockTeacher,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto-seed 7 sections when creating full_test', async () => {
      mockEntityManager.save.mockImplementation(
        async (entityClassOrEntity: any, maybeEntity?: any) => {
          const target = maybeEntity ?? entityClassOrEntity;
          if (Array.isArray(target)) {
            return target.map((item, idx) => ({ ...item, id: `sec-uuid-${idx + 1}` }));
          }
          return { ...target, id: 'exam-uuid-1', createdAt: new Date(), updatedAt: new Date() };
        },
      );

      mockEntityManager.find.mockResolvedValueOnce(mockParts);

      const result = await service.create(
        {
          title: 'ETS 2026 Full Test 01',
          type: ExamType.FULL_TEST,
          durationMinutes: 120,
        },
        mockTeacher,
      );

      expect(result.id).toBe('exam-uuid-1');
      expect(result.sectionsCount).toBe(7);
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2); // 1 for exam, 1 for sections
    });

    it('should throw UnprocessableEntityException if toeic_parts has fewer than 7 parts during full_test seeding', async () => {
      mockEntityManager.save.mockImplementation(async (entity: any) => ({
        ...entity,
        id: 'exam-uuid-1',
      }));
      mockEntityManager.find.mockResolvedValueOnce(mockParts.slice(0, 5));

      await expect(
        service.create(
          {
            title: 'ETS Incomplete Parts',
            type: ExamType.FULL_TEST,
            durationMinutes: 120,
          },
          mockTeacher,
        ),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should create mini_test without auto-seeding sections', async () => {
      mockEntityManager.save.mockImplementation(async (entity: any) => ({
        ...entity,
        id: 'exam-mini-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.create(
        {
          title: 'Mini Test 01',
          type: ExamType.MINI_TEST,
          durationMinutes: 45,
        },
        mockTeacher,
      );

      expect(result.id).toBe('exam-mini-1');
      expect(result.sectionsCount).toBe(0);
      expect(mockEntityManager.find).not.toHaveBeenCalled();
    });
  });

  describe('findManageDetail()', () => {
    it('should throw NotFoundException if exam does not exist or is deleted', async () => {
      examRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.findManageDetail('non-existent-uuid', mockTeacher)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not creator and not admin', async () => {
      examRepo.findOne.mockResolvedValueOnce({
        id: 'exam-uuid-1',
        createdBy: mockTeacher.id,
        isDeleted: false,
      } as Exam);

      await expect(service.findManageDetail('exam-uuid-1', mockOtherTeacher)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return exam detail for creator or admin', async () => {
      const mockExam: Partial<Exam> = {
        id: 'exam-uuid-1',
        title: 'ETS 2026 Full Test 01',
        description: 'Mô tả đề thi',
        type: ExamType.FULL_TEST,
        durationMinutes: 120,
        maxAttempts: 3,
        passingScore: 600,
        openAt: null,
        closeAt: null,
        allowPartPractice: true,
        isShuffledQuestions: false,
        isShuffledOptions: false,
        scoreConversionType: ScoreConversionType.DEFAULT_ETS,
        status: ExamStatus.DRAFT,
        publishedAt: null,
        version: 1,
        createdBy: mockTeacher.id,
        isDeleted: false,
        sections: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      examRepo.findOne.mockResolvedValueOnce(mockExam as Exam);

      const result = await service.findManageDetail('exam-uuid-1', mockTeacher);
      expect(result.id).toBe('exam-uuid-1');
      expect(result.title).toBe('ETS 2026 Full Test 01');

      // Admin access test
      examRepo.findOne.mockResolvedValueOnce(mockExam as Exam);
      const adminResult = await service.findManageDetail('exam-uuid-1', mockAdmin);
      expect(adminResult.id).toBe('exam-uuid-1');
    });
  });

  describe('update()', () => {
    const existingExam: Partial<Exam> = {
      id: 'exam-uuid-1',
      title: 'Original Title',
      description: 'Original Description',
      type: ExamType.FULL_TEST,
      durationMinutes: 120,
      openAt: new Date('2026-10-01T00:00:00.000Z'),
      closeAt: new Date('2026-12-31T23:59:59.000Z'),
      status: ExamStatus.DRAFT,
      version: 2,
      createdBy: mockTeacher.id,
      isDeleted: false,
      sections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should throw NotFoundException if exam is deleted', async () => {
      examRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.update('exam-uuid-1', { version: 1, title: 'New Title' }, mockTeacher),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on version mismatch (Optimistic Locking)', async () => {
      examRepo.findOne.mockResolvedValueOnce({ ...existingExam } as Exam);

      await expect(
        service.update('exam-uuid-1', { version: 1, title: 'New Title' }, mockTeacher),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException on partial update date conflict (effectiveCloseAt <= effectiveOpenAt)', async () => {
      examRepo.findOne.mockResolvedValueOnce({ ...existingExam } as Exam);

      // Client updates only closeAt to an earlier date than existing openAt
      await expect(
        service.update(
          'exam-uuid-1',
          { version: 2, closeAt: '2026-09-01T00:00:00.000Z' },
          mockTeacher,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if modifying locked core fields on a CLOSED exam', async () => {
      examRepo.findOne.mockResolvedValueOnce({
        ...existingExam,
        status: ExamStatus.CLOSED,
      } as Exam);

      await expect(
        service.update('exam-uuid-1', { version: 2, durationMinutes: 150 }, mockTeacher),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if modifying locked core fields when exam has attempts > 0', async () => {
      examRepo.findOne.mockResolvedValueOnce({
        ...existingExam,
        status: ExamStatus.PUBLISHED,
      } as Exam);

      jest.spyOn(service as any, 'getAttemptsCount').mockResolvedValueOnce(5);

      await expect(
        service.update('exam-uuid-1', { version: 2, durationMinutes: 150 }, mockTeacher),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow modifying title and description even if exam is closed or has attempts', async () => {
      const closedExam = {
        ...existingExam,
        status: ExamStatus.CLOSED,
      };
      examRepo.findOne.mockResolvedValueOnce(closedExam as Exam);
      examRepo.save.mockImplementation(async (entity: any) => ({
        ...entity,
        title: 'New Closed Title',
        version: entity.version,
      }));

      const result = await service.update(
        'exam-uuid-1',
        { version: 2, title: 'New Closed Title', description: 'Updated Description' },
        mockTeacher,
      );

      expect(result.title).toBe('New Closed Title');
      expect(result.version).toBe(3); // Incremented
    });

    it('should update successfully and increment version when version matches', async () => {
      examRepo.findOne.mockResolvedValueOnce({ ...existingExam } as Exam);
      examRepo.save.mockImplementation(async (entity: any) => entity);

      const result = await service.update(
        'exam-uuid-1',
        { version: 2, title: 'Updated Title' },
        mockTeacher,
      );

      expect(result.title).toBe('Updated Title');
      expect(result.version).toBe(3);
    });
  });

  describe('remove()', () => {
    it('should throw NotFoundException if exam does not exist or is deleted', async () => {
      examRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.remove('exam-uuid-1', mockTeacher)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not creator and not admin', async () => {
      examRepo.findOne.mockResolvedValueOnce({
        id: 'exam-uuid-1',
        createdBy: mockTeacher.id,
        isDeleted: false,
      } as Exam);

      await expect(service.remove('exam-uuid-1', mockOtherTeacher)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if exam has attempts > 0', async () => {
      examRepo.findOne.mockResolvedValueOnce({
        id: 'exam-uuid-1',
        createdBy: mockTeacher.id,
        isDeleted: false,
      } as Exam);

      jest.spyOn(service as any, 'getAttemptsCount').mockResolvedValueOnce(2);

      await expect(service.remove('exam-uuid-1', mockTeacher)).rejects.toThrow(ConflictException);
    });

    it('should soft delete exam when attempts === 0', async () => {
      const mockExam = {
        id: 'exam-uuid-1',
        createdBy: mockTeacher.id,
        isDeleted: false,
        deletedAt: null,
      };
      examRepo.findOne.mockResolvedValueOnce(mockExam as Exam);
      examRepo.save.mockImplementation(async (entity: any) => entity);

      const result = await service.remove('exam-uuid-1', mockTeacher);

      expect(result.success).toBe(true);
      expect(mockExam.isDeleted).toBe(true);
      expect(mockExam.deletedAt).toBeDefined();
    });
  });
});
