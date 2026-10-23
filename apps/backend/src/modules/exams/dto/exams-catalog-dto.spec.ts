import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryExamsDto } from './request/query-exams.dto';
import { QueryManageExamsDto } from './request/query-manage-exams.dto';
import { ExamStatus } from '../enums/exam-status.enum';
import { ExamType } from '../enums/exam-type.enum';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';

describe('Exams Catalog DTOs & Guards', () => {
  describe('OptionalJwtAuthGuard', () => {
    it('should return user when user is provided', () => {
      const guard = new OptionalJwtAuthGuard();
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const result = guard.handleRequest(null, mockUser, null, null);
      expect(result).toBe(mockUser);
    });

    it('should return null when error occurs or user is not provided (guest mode)', () => {
      const guard = new OptionalJwtAuthGuard();
      const resultNoUser = guard.handleRequest(null, null, null, null);
      expect(resultNoUser).toBeNull();

      const resultErr = guard.handleRequest(new Error('Unauthorized'), null, null, null);
      expect(resultErr).toBeNull();
    });
  });

  describe('QueryExamsDto', () => {
    it('should pass with valid pagination parameters', async () => {
      const dto = plainToInstance(QueryExamsDto, {
        page: 1,
        limit: 20,
        type: ExamType.FULL_TEST,
        search: 'ETS 2026',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when limit exceeds 50 (Tech Debt 003 constraint)', async () => {
      const dto = plainToInstance(QueryExamsDto, {
        page: 1,
        limit: 51,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const limitError = errors.find((e) => e.property === 'limit');
      expect(limitError).toBeDefined();
    });

    it('should fail when page is less than 1', async () => {
      const dto = plainToInstance(QueryExamsDto, {
        page: 0,
        limit: 10,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const pageError = errors.find((e) => e.property === 'page');
      expect(pageError).toBeDefined();
    });
  });

  describe('QueryManageExamsDto', () => {
    it('should allow valid status enum', async () => {
      const dto = plainToInstance(QueryManageExamsDto, {
        page: 1,
        limit: 10,
        status: ExamStatus.DRAFT,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with invalid status enum value', async () => {
      const dto = plainToInstance(QueryManageExamsDto, {
        page: 1,
        limit: 10,
        status: 'UNKNOWN_STATUS',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const statusError = errors.find((e) => e.property === 'status');
      expect(statusError).toBeDefined();
    });
  });
});
