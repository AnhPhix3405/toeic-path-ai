import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam } from '../entities/exam.entity';
import { ExamSection } from '../entities/exam-section.entity';
import { ExamQuestion } from '../entities/exam-question.entity';
import { ExamStatus } from '../enums/exam-status.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { QueryExamsDto } from '../dto/request/query-exams.dto';
import { QueryManageExamsDto } from '../dto/request/query-manage-exams.dto';
import { ExamCatalogItemResponseDto } from '../dto/response/exam-catalog-item-response.dto';
import {
  ExamOverviewResponseDto,
  ExamPartOverviewDto,
} from '../dto/response/exam-overview-response.dto';
import { PaginatedExamsCatalogResponseDto } from '../dto/response/paginated-exams-catalog-response.dto';
import { PaginatedManageExamsResponseDto } from '../dto/response/paginated-manage-exams-response.dto';
import { ExamDetailResponseDto } from '../dto/response/exam-detail-response.dto';

@Injectable()
export class ExamsCatalogService {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepo: Repository<Exam>,
    @InjectRepository(ExamSection)
    private readonly examSectionRepo: Repository<ExamSection>,
    @InjectRepository(ExamQuestion)
    private readonly examQuestionRepo: Repository<ExamQuestion>,
  ) {}

  /**
   * Tra cứu danh mục đề thi công khai cho học viên/khách vãng lai (BR19.1).
   * Tối ưu hóa triệt tiêu N+1: đếm câu hỏi trực tiếp trên database engine.
   */
  async findPublicCatalog(query: QueryExamsDto): Promise<PaginatedExamsCatalogResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 50) : 10;
    const skip = (page - 1) * limit;

    const qb = this.examRepo
      .createQueryBuilder('exam')
      .where('exam.status = :publishedStatus', { publishedStatus: ExamStatus.PUBLISHED })
      .andWhere('exam.isDeleted = false')
      .andWhere('(exam.closeAt IS NULL OR exam.closeAt > NOW())');

    if (query.type) {
      qb.andWhere('exam.type = :type', { type: query.type });
    }

    if (query.search && query.search.trim()) {
      qb.andWhere('LOWER(exam.title) LIKE LOWER(:search)', { search: `%${query.search.trim()}%` });
    }

    // Tối ưu hóa đếm tổng số câu hỏi bằng subquery trực tiếp ở tầng SQL
    qb.addSelect((subQuery) => {
      return subQuery
        .select('COUNT(eq.id)', 'count')
        .from(ExamQuestion, 'eq')
        .where('eq.exam_id = exam.id');
    }, 'totalQuestionsCount');

    qb.orderBy('exam.openAt', 'ASC', 'NULLS LAST');
    qb.addOrderBy('exam.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [exams, total] = await qb.getManyAndCount();
    const rawEntities = await qb.getRawMany<Record<string, unknown>>();
    const countMap = new Map<string, number>();
    for (const r of rawEntities) {
      const examId = (r.exam_id as string) || (r.id as string);
      const c = Number(r.totalQuestionsCount ?? 0);
      if (examId) countMap.set(examId, c);
    }

    const now = new Date();

    const items: ExamCatalogItemResponseDto[] = exams.map((exam) => {
      const isScheduled = exam.openAt ? new Date(exam.openAt).getTime() > now.getTime() : false;
      const totalQuestions = countMap.get(exam.id) ?? 0;
      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        type: exam.type,
        durationMinutes: exam.durationMinutes,
        totalQuestions,
        allowPartPractice: exam.allowPartPractice,
        totalAttempts: 0, // Forward compatibility cho Sprint 6 (bảng exam_attempts)
        openAt: exam.openAt,
        closeAt: exam.closeAt,
        isScheduled,
      };
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Tra cứu danh mục đề thi nội bộ cho Teacher/Admin (BR19.2).
   */
  async findManagementCatalog(
    query: QueryManageExamsDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedManageExamsResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 50) : 10;
    const skip = (page - 1) * limit;

    const qb = this.examRepo
      .createQueryBuilder('exam')
      .leftJoinAndSelect('exam.sections', 'sections')
      .where('exam.isDeleted = false');

    if (user.role === UserRole.TEACHER) {
      qb.andWhere('(exam.createdBy = :userId OR exam.status = :publishedStatus)', {
        userId: user.id,
        publishedStatus: ExamStatus.PUBLISHED,
      });
    }

    if (query.status) {
      qb.andWhere('exam.status = :status', { status: query.status });
    }

    if (query.type) {
      qb.andWhere('exam.type = :type', { type: query.type });
    }

    if (query.search && query.search.trim()) {
      qb.andWhere('LOWER(exam.title) LIKE LOWER(:search)', { search: `%${query.search.trim()}%` });
    }

    qb.orderBy('exam.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [exams, total] = await qb.getManyAndCount();

    const items: ExamDetailResponseDto[] = exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      type: exam.type,
      durationMinutes: exam.durationMinutes,
      maxAttempts: exam.maxAttempts,
      passingScore: exam.passingScore,
      openAt: exam.openAt,
      closeAt: exam.closeAt,
      allowPartPractice: exam.allowPartPractice,
      isShuffledQuestions: exam.isShuffledQuestions,
      isShuffledOptions: exam.isShuffledOptions,
      scoreConversionType: exam.scoreConversionType,
      status: exam.status,
      publishedAt: exam.publishedAt,
      version: exam.version,
      createdBy: exam.createdBy,
      isDeleted: exam.isDeleted,
      sectionsCount: exam.sections ? exam.sections.length : 0,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
    }));

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Xem chi tiết tổng quan đề thi với nguyên tắc Zero Answer Leakage (BR19.3).
   * Tuyệt đối không trả về câu hỏi, đáp án đúng hay lời giải thích.
   */
  async getExamOverview(
    examId: string,
    user?: AuthenticatedUser | null,
  ): Promise<ExamOverviewResponseDto> {
    const exam = await this.examRepo.findOne({
      where: { id: examId, isDeleted: false },
    });

    if (!exam || exam.status !== ExamStatus.PUBLISHED) {
      throw new NotFoundException({
        errorCode: 'ERR_EXAM_NOT_FOUND',
        message: 'Đề thi không tồn tại hoặc chưa được xuất bản.',
      });
    }

    const now = new Date();
    if (exam.closeAt && new Date(exam.closeAt).getTime() <= now.getTime()) {
      throw new BadRequestException({
        errorCode: 'ERR_EXAM_CLOSED',
        message: 'Đề thi đã đóng, không còn tiếp nhận lượt thi mới.',
      });
    }

    const isScheduled = exam.openAt ? new Date(exam.openAt).getTime() > now.getTime() : false;

    // Load sections và part sắp xếp theo partNumber ASC
    const sections = await this.examSectionRepo.find({
      where: { examId },
      relations: { part: true },
    });

    sections.sort((a, b) => (a.part?.partNumber ?? 0) - (b.part?.partNumber ?? 0));

    // Đếm số lượng câu hỏi của từng section trực tiếp trên SQL (tránh eager loading options/answers)
    const sectionQuestionCounts = await this.examQuestionRepo
      .createQueryBuilder('eq')
      .select('eq.examSectionId', 'sectionId')
      .addSelect('COUNT(eq.id)', 'count')
      .where('eq.examId = :examId', { examId })
      .groupBy('eq.examSectionId')
      .getRawMany<{ sectionId: string; count: string }>();

    const countMap = new Map<string, number>();
    for (const item of sectionQuestionCounts) {
      countMap.set(item.sectionId, parseInt(item.count, 10) || 0);
    }

    let totalQuestions = 0;
    const parts: ExamPartOverviewDto[] = sections.map((sec) => {
      const qCount = countMap.get(sec.id) ?? 0;
      totalQuestions += qCount;
      return {
        partNumber: sec.part?.partNumber ?? 0,
        partName: sec.part?.name ?? `Part ${sec.part?.partNumber ?? ''}`,
        questionCount: qCount,
        suggestedDuration: sec.targetDurationMinutes,
      };
    });

    // Tính remainingAttempts
    let remainingAttempts: number | null = null;
    if (user && exam.maxAttempts !== null) {
      // Trong Sprint 5, chưa có bảng exam_attempts (thuộc Sprint 6) nên số lượt còn lại = maxAttempts
      remainingAttempts = exam.maxAttempts;
    }

    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      type: exam.type,
      durationMinutes: exam.durationMinutes,
      totalQuestions,
      allowPartPractice: exam.allowPartPractice,
      parts,
      openAt: exam.openAt,
      closeAt: exam.closeAt,
      isScheduled,
      remainingAttempts,
    };
  }
}
