import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Exam } from '../entities/exam.entity';
import { ExamSection } from '../entities/exam-section.entity';
import { ToeicPart } from '../../questions/entities/toeic-part.entity';
import { CreateExamDto } from '../dto/request/create-exam.dto';
import { UpdateExamDto } from '../dto/request/update-exam.dto';
import { ExamDetailResponseDto } from '../dto/response/exam-detail-response.dto';
import { ExamType } from '../enums/exam-type.enum';
import { ExamStatus } from '../enums/exam-status.enum';
import { ScoreConversionType } from '../enums/score-conversion-type.enum';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { UserRole } from '../../../common/enums/user-role.enum';

export const FULL_TEST_SECTIONS = [
  { partNumber: 1, targetQuestionsCount: 6, targetDurationMinutes: null },
  { partNumber: 2, targetQuestionsCount: 25, targetDurationMinutes: null },
  { partNumber: 3, targetQuestionsCount: 39, targetDurationMinutes: null },
  { partNumber: 4, targetQuestionsCount: 30, targetDurationMinutes: null },
  { partNumber: 5, targetQuestionsCount: 30, targetDurationMinutes: 12 },
  { partNumber: 6, targetQuestionsCount: 16, targetDurationMinutes: 8 },
  { partNumber: 7, targetQuestionsCount: 54, targetDurationMinutes: 55 },
];

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepo: Repository<Exam>,
    @InjectRepository(ExamSection)
    private readonly sectionRepo: Repository<ExamSection>,
    @InjectRepository(ToeicPart)
    private readonly partRepo: Repository<ToeicPart>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateExamDto, user: AuthenticatedUser): Promise<ExamDetailResponseDto> {
    if (dto.closeAt && dto.openAt && new Date(dto.closeAt) <= new Date(dto.openAt)) {
      throw new BadRequestException({
        message: 'Thời điểm đóng thi phải sau thời điểm mở thi.',
        code: 'ERR_INVALID_SCHEDULE_TIME',
      });
    }

    return this.dataSource.transaction(async (manager) => {
      const exam = manager.create(Exam, {
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type,
        durationMinutes: dto.durationMinutes,
        maxAttempts: dto.maxAttempts ?? null,
        passingScore: dto.passingScore ?? null,
        openAt: dto.openAt ? new Date(dto.openAt) : null,
        closeAt: dto.closeAt ? new Date(dto.closeAt) : null,
        allowPartPractice: dto.allowPartPractice ?? true,
        isShuffledQuestions: dto.isShuffledQuestions ?? false,
        isShuffledOptions: dto.isShuffledOptions ?? false,
        scoreConversionType: dto.scoreConversionType ?? ScoreConversionType.DEFAULT_ETS,
        status: ExamStatus.DRAFT,
        version: 1,
        createdBy: user.id,
        isDeleted: false,
      });

      const savedExam = await manager.save(Exam, exam);

      let sections: ExamSection[] = [];
      if (dto.type === ExamType.FULL_TEST) {
        const parts = await manager.find(ToeicPart, { order: { partNumber: 'ASC' } });
        if (parts.length < 7) {
          throw new UnprocessableEntityException({
            message: 'Ngân hàng dữ liệu TOEIC Parts chưa đủ 7 phần chuẩn để khởi tạo Full Test.',
            code: 'ERR_TOEIC_PARTS_INCOMPLETE',
          });
        }

        const partMap = new Map<number, ToeicPart>(parts.map((p) => [p.partNumber, p]));
        sections = FULL_TEST_SECTIONS.map((standard) => {
          const part = partMap.get(standard.partNumber)!;
          return manager.create(ExamSection, {
            examId: savedExam.id,
            partId: part.id,
            part,
            targetQuestionsCount: standard.targetQuestionsCount,
            targetDurationMinutes: standard.targetDurationMinutes,
          });
        });

        await manager.save(ExamSection, sections);
      }

      return this.mapToDetailDto(savedExam, sections);
    });
  }

  async findManageDetail(examId: string, user: AuthenticatedUser): Promise<ExamDetailResponseDto> {
    const exam = await this.examRepo.findOne({
      where: { id: examId, isDeleted: false },
      relations: { sections: { part: true } },
    });

    if (!exam) {
      throw new NotFoundException('Không tìm thấy đề thi');
    }

    this.validateAccess(exam, user);
    return this.mapToDetailDto(exam, exam.sections);
  }

  async update(
    examId: string,
    dto: UpdateExamDto,
    user: AuthenticatedUser,
  ): Promise<ExamDetailResponseDto> {
    const exam = await this.examRepo.findOne({
      where: { id: examId, isDeleted: false },
      relations: { sections: { part: true } },
    });

    if (!exam) {
      throw new NotFoundException('Không tìm thấy đề thi');
    }

    this.validateAccess(exam, user);

    if (exam.version !== dto.version) {
      throw new ConflictException({
        message: 'Đề thi đã bị thay đổi bởi phiên làm việc khác. Vui lòng làm mới trang.',
        code: 'ERR_CONCURRENCY_CONFLICT',
      });
    }

    const attemptsCount = await this.getAttemptsCount(exam.id);
    const isLocked = exam.status === ExamStatus.CLOSED || attemptsCount > 0;

    if (isLocked) {
      const lockedFields: (keyof UpdateExamDto)[] = [
        'type',
        'durationMinutes',
        'maxAttempts',
        'passingScore',
        'isShuffledQuestions',
        'isShuffledOptions',
        'scoreConversionType',
        'allowPartPractice',
      ];
      const hasLockedField = lockedFields.some((field) => dto[field] !== undefined);
      if (hasLockedField) {
        throw new BadRequestException({
          message:
            'Đề thi đã đóng hoặc đã có học viên tham gia, chỉ cho phép chỉnh sửa tiêu đề và mô tả.',
          code: 'ERR_EXAM_LOCKED_FIELDS',
        });
      }
    }

    const effectiveOpenAt =
      dto.openAt !== undefined ? (dto.openAt ? new Date(dto.openAt) : null) : exam.openAt;
    const effectiveCloseAt =
      dto.closeAt !== undefined ? (dto.closeAt ? new Date(dto.closeAt) : null) : exam.closeAt;

    if (
      effectiveOpenAt &&
      effectiveCloseAt &&
      new Date(effectiveCloseAt) <= new Date(effectiveOpenAt)
    ) {
      throw new BadRequestException({
        message: 'Thời điểm đóng thi phải sau thời điểm mở thi.',
        code: 'ERR_INVALID_SCHEDULE_TIME',
      });
    }

    if (dto.title !== undefined) exam.title = dto.title;
    if (dto.description !== undefined) exam.description = dto.description ?? null;

    if (!isLocked) {
      if (dto.type !== undefined) exam.type = dto.type;
      if (dto.durationMinutes !== undefined) exam.durationMinutes = dto.durationMinutes;
      if (dto.maxAttempts !== undefined) exam.maxAttempts = dto.maxAttempts ?? null;
      if (dto.passingScore !== undefined) exam.passingScore = dto.passingScore ?? null;
      if (dto.allowPartPractice !== undefined) exam.allowPartPractice = dto.allowPartPractice;
      if (dto.isShuffledQuestions !== undefined) exam.isShuffledQuestions = dto.isShuffledQuestions;
      if (dto.isShuffledOptions !== undefined) exam.isShuffledOptions = dto.isShuffledOptions;
      if (dto.scoreConversionType !== undefined) exam.scoreConversionType = dto.scoreConversionType;
    }

    if (dto.openAt !== undefined) exam.openAt = effectiveOpenAt;
    if (dto.closeAt !== undefined) exam.closeAt = effectiveCloseAt;

    exam.version = exam.version + 1;
    const savedExam = await this.examRepo.save(exam);
    return this.mapToDetailDto(savedExam, exam.sections);
  }

  async remove(
    examId: string,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    const exam = await this.examRepo.findOne({
      where: { id: examId, isDeleted: false },
    });

    if (!exam) {
      throw new NotFoundException('Không tìm thấy đề thi');
    }

    this.validateAccess(exam, user);

    const attemptsCount = await this.getAttemptsCount(exam.id);
    if (attemptsCount > 0) {
      throw new ConflictException({
        message:
          'Đề thi đã có học viên tham gia, không thể xóa. Vui lòng chuyển trạng thái sang Lưu trữ (Archived)',
        code: 'ERR_EXAM_HAS_ATTEMPTS',
      });
    }

    exam.isDeleted = true;
    exam.deletedAt = new Date();
    await this.examRepo.save(exam);

    return {
      success: true,
      message: 'Xóa đề thi thành công.',
    };
  }

  protected validateAccess(exam: Exam, user: AuthenticatedUser): void {
    if (user.role !== UserRole.ADMIN && exam.createdBy !== user.id) {
      throw new ForbiddenException({
        message: 'Bạn không có quyền thao tác trên đề thi này.',
        code: 'ERR_FORBIDDEN_EXAM_ACCESS',
      });
    }
  }

  protected getAttemptsCount(examId: string): Promise<number> {
    void examId;
    // Sprint 5 fallback; Sprint 6 will query exam_attempts table
    return Promise.resolve(0);
  }

  private mapToDetailDto(exam: Exam, sections?: ExamSection[]): ExamDetailResponseDto {
    const sortedSections = [...(sections ?? [])].sort((a, b) => {
      const pA = a.part?.partNumber ?? 0;
      const pB = b.part?.partNumber ?? 0;
      return pA - pB;
    });

    return {
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
      sectionsCount: sections ? sections.length : 0,
      sections: sortedSections.map((sec) => ({
        id: sec.id,
        examId: sec.examId,
        partId: sec.partId,
        partNumber: sec.part?.partNumber,
        partName: sec.part?.name,
        targetQuestionsCount: sec.targetQuestionsCount,
        targetDurationMinutes: sec.targetDurationMinutes,
      })),
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
    };
  }
}
