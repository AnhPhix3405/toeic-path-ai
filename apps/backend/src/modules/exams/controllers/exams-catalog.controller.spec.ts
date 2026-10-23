import { Test, TestingModule } from '@nestjs/testing';
import { ExamsCatalogController } from './exams-catalog.controller';
import { ExamsCatalogService } from '../services/exams-catalog.service';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ExamType } from '../enums/exam-type.enum';
import { ExamStatus } from '../enums/exam-status.enum';

describe('ExamsCatalogController', () => {
  let controller: ExamsCatalogController;
  let mockService: any;

  beforeEach(async () => {
    mockService = {
      findPublicCatalog: jest.fn(),
      findManagementCatalog: jest.fn(),
      getExamOverview: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamsCatalogController],
      providers: [
        {
          provide: ExamsCatalogService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ExamsCatalogController>(ExamsCatalogController);
  });

  describe('getPublicCatalog', () => {
    it('should delegate to service.findPublicCatalog', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      mockService.findPublicCatalog.mockResolvedValue(mockResult);

      const query = { page: 1, limit: 10, type: ExamType.FULL_TEST };
      const result = await controller.getPublicCatalog(query);

      expect(mockService.findPublicCatalog).toHaveBeenCalledWith(query);
      expect(result).toBe(mockResult);
    });
  });

  describe('getManagementCatalog', () => {
    it('should delegate to service.findManagementCatalog with authenticated user', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      mockService.findManagementCatalog.mockResolvedValue(mockResult);

      const user = { id: 'teacher-1', email: 'teacher@test.com', role: UserRole.TEACHER };
      const query = { page: 1, limit: 10, status: ExamStatus.DRAFT };
      const result = await controller.getManagementCatalog(query, user);

      expect(mockService.findManagementCatalog).toHaveBeenCalledWith(query, user);
      expect(result).toBe(mockResult);
    });
  });

  describe('getExamOverview', () => {
    it('should delegate to service.getExamOverview with optional user', async () => {
      const mockOverview = {
        id: 'exam-1',
        title: 'ETS 2026',
        parts: [],
      };
      mockService.getExamOverview.mockResolvedValue(mockOverview);

      const user = { id: 'user-1', email: 'user@test.com', role: UserRole.STUDENT };
      const result = await controller.getExamOverview('exam-1', user);

      expect(mockService.getExamOverview).toHaveBeenCalledWith('exam-1', user);
      expect(result).toBe(mockOverview);
    });
  });
});
