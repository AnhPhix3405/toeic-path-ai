import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PolicyThrottlerGuard } from '../../../common/rate-limit/guards/policy-throttler.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateQuestionReportDto } from '../dto/request/create-question-report.dto';
import { QueryMyQuestionReportsDto } from '../dto/request/query-my-question-reports.dto';
import { QueryQuestionReportsDto } from '../dto/request/query-question-reports.dto';
import { ResolveQuestionReportDto } from '../dto/request/resolve-question-report.dto';
import { QuestionReportReason } from '../enums/question-report-reason.enum';
import { QuestionReportStatus } from '../enums/question-report-status.enum';
import { QuestionReportsService } from '../services/question-reports.service';
import { QuestionReportsController } from './question-reports.controller';

describe('QuestionReportsController (UC29 & UC49)', () => {
  let controller: QuestionReportsController;
  let serviceMock: {
    createReport: jest.Mock;
    getMyReports: jest.Mock;
    getReportsForManagement: jest.Mock;
    getReportDetail: jest.Mock;
    resolveReport: jest.Mock;
  };

  const mockStudent: AuthenticatedUser = {
    id: 'student-uuid-1',
    sessionId: 'sess-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
  };

  const mockTeacher: AuthenticatedUser = {
    id: 'teacher-uuid-1',
    sessionId: 'sess-2',
    email: 'teacher@example.com',
    role: UserRole.TEACHER,
    status: UserStatus.ACTIVE,
  };

  beforeEach(async () => {
    serviceMock = {
      createReport: jest.fn(),
      getMyReports: jest.fn(),
      getReportsForManagement: jest.fn(),
      getReportDetail: jest.fn(),
      resolveReport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionReportsController],
      providers: [
        {
          provide: QuestionReportsService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PolicyThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<QuestionReportsController>(QuestionReportsController);
  });

  it('should declare getMyReports BEFORE getReportDetail on QuestionReportsController prototype to prevent :id ParseUUIDPipe collision (PMR 028 & PMR 031)', () => {
    const methodNames = Object.getOwnPropertyNames(QuestionReportsController.prototype);
    const myIdx = methodNames.indexOf('getMyReports');
    const detailIdx = methodNames.indexOf('getReportDetail');

    expect(myIdx).toBeGreaterThan(-1);
    expect(detailIdx).toBeGreaterThan(-1);
    expect(myIdx).toBeLessThan(detailIdx);
  });

  it('should enforce RBAC @Roles(TEACHER, ADMIN) on UC49 endpoints while leaving UC29 endpoints open to authenticated students', () => {
    const reflector = new Reflector();

    const createRoles = reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      QuestionReportsController.prototype.createReport,
      QuestionReportsController,
    ]);
    const myRoles = reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      QuestionReportsController.prototype.getMyReports,
      QuestionReportsController,
    ]);
    const listRoles = reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      QuestionReportsController.prototype.getReportsForManagement,
      QuestionReportsController,
    ]);
    const detailRoles = reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      QuestionReportsController.prototype.getReportDetail,
      QuestionReportsController,
    ]);
    const resolveRoles = reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      QuestionReportsController.prototype.resolveReport,
      QuestionReportsController,
    ]);

    expect(createRoles).toBeUndefined();
    expect(myRoles).toBeUndefined();
    expect(listRoles).toEqual([UserRole.TEACHER, UserRole.ADMIN]);
    expect(detailRoles).toEqual([UserRole.TEACHER, UserRole.ADMIN]);
    expect(resolveRoles).toEqual([UserRole.TEACHER, UserRole.ADMIN]);
  });

  describe('createReport (UC29)', () => {
    it('should call service.createReport with user.id, questionId, and dto', async () => {
      const dto: CreateQuestionReportDto = {
        reason: QuestionReportReason.WRONG_ANSWER,
      };
      const mockResponse = {
        id: 'rep-1',
        questionId: 'q-1',
        status: QuestionReportStatus.PENDING,
      };
      serviceMock.createReport.mockResolvedValue(mockResponse);

      const res = await controller.createReport(mockStudent, 'q-1', dto);

      expect(res).toEqual(mockResponse);
      expect(serviceMock.createReport).toHaveBeenCalledWith('student-uuid-1', 'q-1', dto);
    });
  });

  describe('getMyReports (UC29)', () => {
    it('should call service.getMyReports with user.id and query', async () => {
      const query: QueryMyQuestionReportsDto = { page: 1, limit: 10 };
      const mockResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      serviceMock.getMyReports.mockResolvedValue(mockResponse);

      const res = await controller.getMyReports(mockStudent, query);

      expect(res).toEqual(mockResponse);
      expect(serviceMock.getMyReports).toHaveBeenCalledWith('student-uuid-1', query);
    });
  });

  describe('getReportsForManagement, getReportDetail & resolveReport (UC49)', () => {
    it('should delegate management list, detail, and resolve calls to service', async () => {
      const query: QueryQuestionReportsDto = {
        page: 1,
        limit: 20,
        status: QuestionReportStatus.PENDING,
      };
      serviceMock.getReportsForManagement.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      await controller.getReportsForManagement(query);
      expect(serviceMock.getReportsForManagement).toHaveBeenCalledWith(query);

      serviceMock.getReportDetail.mockResolvedValue({ id: 'rep-1' });
      await controller.getReportDetail('rep-1');
      expect(serviceMock.getReportDetail).toHaveBeenCalledWith('rep-1');

      const resolveDto: ResolveQuestionReportDto = {
        status: QuestionReportStatus.RESOLVED,
        resolutionNote: 'Đã sửa lại nội dung câu hỏi.',
        resolveAllForQuestion: true,
      };
      serviceMock.resolveReport.mockResolvedValue({
        id: 'rep-1',
        status: QuestionReportStatus.RESOLVED,
        bulkResolvedCount: 2,
      });
      await controller.resolveReport(mockTeacher, 'rep-1', resolveDto);
      expect(serviceMock.resolveReport).toHaveBeenCalledWith('teacher-uuid-1', 'rep-1', resolveDto);
    });
  });
});
