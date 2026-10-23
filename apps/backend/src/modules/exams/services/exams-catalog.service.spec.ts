import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExamsCatalogService } from './exams-catalog.service';
import { Exam } from '../entities/exam.entity';
import { ExamSection } from '../entities/exam-section.entity';
import { ExamQuestion } from '../entities/exam-question.entity';
import { ExamStatus } from '../enums/exam-status.enum';
import { ExamType } from '../enums/exam-type.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';

describe('ExamsCatalogService', () => {
  let service: ExamsCatalogService;
  let mockExamRepo: any;
  let mockExamSectionRepo: any;
  let mockExamQuestionRepo: any;

  beforeEach(async () => {
    mockExamRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };
    mockExamSectionRepo = {
      find: jest.fn(),
    };
    mockExamQuestionRepo = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsCatalogService,
        {
          provide: getRepositoryToken(Exam),
          useValue: mockExamRepo,
        },
        {
          provide: getRepositoryToken(ExamSection),
          useValue: mockExamSectionRepo,
        },
        {
          provide: getRepositoryToken(ExamQuestion),
          useValue: mockExamQuestionRepo,
        },
      ],
    }).compile();

    service = module.get<ExamsCatalogService>(ExamsCatalogService);
  });

  describe('findPublicCatalog', () => {
    it('should query published exams, calculate isScheduled, and return standardized envelope', async () => {
      const futureDate = new Date(Date.now() + 86400000);

      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 'exam-1',
              title: 'Exam 1',
              description: 'Desc 1',
              type: ExamType.FULL_TEST,
              durationMinutes: 120,
              allowPartPractice: true,
              openAt: futureDate,
              closeAt: null,
              totalQuestions: 200,
            },
          ],
          1,
        ]),
      };
      mockExamRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findPublicCatalog({ page: 1, limit: 10 });

      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.items[0].isScheduled).toBe(true);
      expect(result.items[0].totalQuestions).toBe(200);
      expect(result.items[0].totalAttempts).toBe(0);
    });
  });

  describe('findManagementCatalog', () => {
    it('should filter by creator or published status for teachers', async () => {
      const teacherUser: AuthenticatedUser = {
        id: 'teacher-1',
        email: 'teacher@test.com',
        role: UserRole.TEACHER,
      };

      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 'exam-1',
              title: 'Exam 1',
              status: ExamStatus.DRAFT,
              createdBy: 'teacher-1',
              sections: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          1,
        ]),
      };
      mockExamRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findManagementCatalog({ page: 1, limit: 10 }, teacherUser);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('exam.createdBy = :userId OR exam.status = :publishedStatus'),
        expect.objectContaining({ userId: 'teacher-1', publishedStatus: ExamStatus.PUBLISHED }),
      );
      expect(result.items.length).toBe(1);
    });

    it('should not restrict to creator for admins', async () => {
      const adminUser: AuthenticatedUser = {
        id: 'admin-1',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
      };

      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockExamRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findManagementCatalog(
        { page: 1, limit: 10, status: ExamStatus.CLOSED },
        adminUser,
      );

      expect(qb.andWhere).toHaveBeenCalledWith('exam.status = :status', {
        status: ExamStatus.CLOSED,
      });
    });
  });

  describe('getExamOverview', () => {
    it('should throw NotFoundException if exam is not found or not published', async () => {
      mockExamRepo.findOne.mockResolvedValue(null);

      await expect(service.getExamOverview('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if exam is closed', async () => {
      const pastDate = new Date(Date.now() - 3600000);
      mockExamRepo.findOne.mockResolvedValue({
        id: 'exam-1',
        status: ExamStatus.PUBLISHED,
        isDeleted: false,
        closeAt: pastDate,
      });

      await expect(service.getExamOverview('exam-1')).rejects.toThrow(BadRequestException);
    });

    it('should return overview with sorted parts and no question/answer leak', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const mockExam = {
        id: 'exam-1',
        title: 'ETS 2026 Test 01',
        description: 'Test description',
        type: ExamType.FULL_TEST,
        durationMinutes: 120,
        allowPartPractice: true,
        maxAttempts: 3,
        openAt: futureDate,
        closeAt: null,
        status: ExamStatus.PUBLISHED,
        isDeleted: false,
      };
      mockExamRepo.findOne.mockResolvedValue(mockExam);

      mockExamSectionRepo.find.mockResolvedValue([
        {
          id: 'sec-2',
          targetDurationMinutes: 20,
          part: { partNumber: 2, name: 'Part 2: Question-Response' },
        },
        {
          id: 'sec-1',
          targetDurationMinutes: 10,
          part: { partNumber: 1, name: 'Part 1: Photographs' },
        },
      ]);

      const mockCountQb: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { sectionId: 'sec-1', count: '6' },
          { sectionId: 'sec-2', count: '25' },
        ]),
      };
      mockExamQuestionRepo.createQueryBuilder.mockReturnValue(mockCountQb);

      const authenticatedUser: AuthenticatedUser = {
        id: 'user-1',
        email: 'user@test.com',
        role: UserRole.STUDENT,
      };

      const overview = await service.getExamOverview('exam-1', authenticatedUser);

      expect(overview.id).toBe('exam-1');
      expect(overview.isScheduled).toBe(true);
      expect(overview.remainingAttempts).toBe(3);
      expect(overview.totalQuestions).toBe(31);
      expect(overview.parts.length).toBe(2);
      expect(overview.parts[0].partNumber).toBe(1);
      expect(overview.parts[0].questionCount).toBe(6);
      expect(overview.parts[1].partNumber).toBe(2);
      expect(overview.parts[1].questionCount).toBe(25);
      expect((overview as any).questions).toBeUndefined();
      expect((overview as any).options).toBeUndefined();
    });
  });
});
