import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Exam } from '../entities/exam.entity';
import { ExamType } from '../enums/exam-type.enum';
import { ExamStatus } from '../enums/exam-status.enum';
import { QuestionStatus } from '../../questions/enums/question-status.enum';
import { MediaResourceType } from '../../questions/enums/media-resource-type.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { ChangeExamStatusDto } from '../dto/request/change-exam-status.dto';
import { ExamPublishResultResponseDto } from '../dto/response/exam-publish-result-response.dto';

const STANDARD_FULL_TEST_PART_COUNTS: Record<number, number> = {
  1: 6,
  2: 25,
  3: 39,
  4: 30,
  5: 30,
  6: 16,
  7: 54,
};

@Injectable()
export class ExamsPublishingService {
  private readonly logger = new Logger(ExamsPublishingService.name);

  constructor(
    @InjectRepository(Exam)
    private readonly examRepo: Repository<Exam>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Thẩm định toàn diện checklist xuất bản đề thi (BR18.1, PMR 008, PMR 013).
   * Thực hiện trực tiếp trên metadata CSDL, không gọi HTTP đồng bộ ra ngoài.
   */
  async validatePublishChecklist(exam: Exam, manager?: EntityManager): Promise<void> {
    void manager;
    await Promise.resolve();
    const questions = exam.questions ?? [];
    const sections = exam.sections ?? [];

    // 1. Kiểm tra số lượng và cấu trúc câu hỏi theo loại đề
    if (exam.type === ExamType.FULL_TEST) {
      if (questions.length !== 200) {
        throw new BadRequestException({
          message: `Đề thi Full Test phải có chính xác 200 câu hỏi (hiện có ${questions.length} câu).`,
          code: 'ERR_EXAM_INCOMPLETE_QUESTIONS',
        });
      }

      // Đếm số câu theo từng part
      const countByPart: Record<number, number> = {};
      for (const eq of questions) {
        const partNumber = eq.section?.part?.partNumber;
        if (partNumber) {
          countByPart[partNumber] = (countByPart[partNumber] || 0) + 1;
        }
      }

      for (let p = 1; p <= 7; p++) {
        const expected = STANDARD_FULL_TEST_PART_COUNTS[p];
        const actual = countByPart[p] || 0;
        if (actual !== expected) {
          throw new BadRequestException({
            message: `Part ${p} của đề Full Test yêu cầu ${expected} câu (hiện có ${actual} câu).`,
            code: 'ERR_EXAM_INCOMPLETE_QUESTIONS',
          });
        }
      }
    } else if (exam.type === ExamType.PLACEMENT_TEST) {
      if (questions.length < 20 || questions.length > 100) {
        throw new BadRequestException({
          message: `Đề Placement Test phải có từ 20 đến 100 câu hỏi (hiện có ${questions.length} câu).`,
          code: 'ERR_EXAM_INCOMPLETE_QUESTIONS',
        });
      }

      const hasListening = questions.some((eq) => {
        const p = eq.section?.part?.partNumber;
        return p && p >= 1 && p <= 4;
      });

      const hasReading = questions.some((eq) => {
        const p = eq.section?.part?.partNumber;
        return p && p >= 5 && p <= 7;
      });

      if (!hasListening || !hasReading) {
        throw new BadRequestException({
          message:
            'Đề Placement Test bắt buộc phải có cả phần Listening (Part 1-4) và Reading (Part 5-7).',
          code: 'ERR_EXAM_INCOMPLETE_QUESTIONS',
        });
      }
    } else if (exam.type === ExamType.MINI_TEST) {
      for (const sec of sections) {
        const partNum = sec.part?.partNumber;
        const actualInSec = questions.filter(
          (eq) => eq.section?.part?.partNumber === partNum,
        ).length;
        if (actualInSec !== sec.targetQuestionsCount) {
          throw new BadRequestException({
            message: `Section Part ${partNum} yêu cầu ${sec.targetQuestionsCount} câu (hiện có ${actualInSec} câu).`,
            code: 'ERR_EXAM_INCOMPLETE_QUESTIONS',
          });
        }
      }
    }

    // 2. Kiểm tra chuỗi orderIndex liên tục
    const sortedQuestions = [...questions].sort((a, b) => a.orderIndex - b.orderIndex);
    for (let i = 0; i < sortedQuestions.length; i++) {
      if (sortedQuestions[i].orderIndex !== i + 1) {
        throw new BadRequestException({
          message: `Thứ tự câu hỏi bị gián đoạn tại vị trí ${i + 1} (nhận được orderIndex: ${sortedQuestions[i].orderIndex}).`,
          code: 'ERR_EXAM_ORDER_DISCONTINUOUS',
        });
      }
    }

    // 3. Kiểm tra trạng thái câu hỏi, Single Choice Invariant, Media & Context
    const invalidQuestionIds: string[] = [];

    for (const eq of questions) {
      const q = eq.question;
      if (!q) {
        invalidQuestionIds.push(eq.questionId);
        continue;
      }

      // Check trạng thái published
      if (q.status !== QuestionStatus.PUBLISHED) {
        invalidQuestionIds.push(q.id);
        continue;
      }

      // Check Single Choice Invariant (chính xác 1 option đúng)
      const options = q.options ?? [];
      const correctOptionsCount = options.filter((o) => o.isCorrect === true).length;
      if (correctOptionsCount !== 1) {
        invalidQuestionIds.push(q.id);
        continue;
      }

      const partNum = eq.section?.part?.partNumber;
      const mediaList = q.mediaResources?.filter((m) => !m.isDeleted && Boolean(m.fileUrl)) ?? [];

      // Part 1: Bắt buộc cả Image VÀ Audio
      if (partNum === 1) {
        const hasImage = mediaList.some((m) => m.resourceType === MediaResourceType.IMAGE);
        const hasAudio = mediaList.some((m) => m.resourceType === MediaResourceType.AUDIO);
        if (!hasImage || !hasAudio) {
          invalidQuestionIds.push(q.id);
          continue;
        }
      }

      // Part 2: Bắt buộc Audio
      if (partNum === 2) {
        const hasAudio = mediaList.some((m) => m.resourceType === MediaResourceType.AUDIO);
        if (!hasAudio) {
          invalidQuestionIds.push(q.id);
          continue;
        }
      }

      // Part 3, 4: Bắt buộc Audio (tại QuestionGroup hoặc Question)
      if (partNum === 3 || partNum === 4) {
        const groupMedia =
          q.questionGroup?.mediaResources?.filter((m) => !m.isDeleted && Boolean(m.fileUrl)) ?? [];
        const hasAudio =
          groupMedia.some((m) => m.resourceType === MediaResourceType.AUDIO) ||
          mediaList.some((m) => m.resourceType === MediaResourceType.AUDIO);
        if (!hasAudio) {
          invalidQuestionIds.push(q.id);
          continue;
        }
      }

      // Part 6, 7: Nhóm câu hỏi bắt buộc context bài đọc không được rỗng
      if (partNum === 6 || partNum === 7) {
        if (q.questionGroup) {
          const context = q.questionGroup.context?.trim();
          if (!context) {
            invalidQuestionIds.push(q.id);
            continue;
          }
        }
      }
    }

    if (invalidQuestionIds.length > 0) {
      throw new BadRequestException({
        message: `Đề thi chứa ${invalidQuestionIds.length} câu hỏi không hợp lệ (chưa xuất bản, thiếu media, sai đáp án đúng hoặc thiếu context).`,
        code: 'ERR_EXAM_INVALID_QUESTIONS',
        invalidQuestionIds,
      });
    }

    // 4. Kiểm tra thời gian mở/đóng
    if (exam.openAt && exam.closeAt) {
      if (new Date(exam.closeAt) <= new Date(exam.openAt)) {
        throw new BadRequestException({
          message: 'Thời điểm đóng thi phải sau thời điểm mở thi.',
          code: 'ERR_INVALID_SCHEDULE_TIME',
        });
      }
    }

    if (exam.closeAt && new Date(exam.closeAt) <= new Date()) {
      throw new BadRequestException({
        message: 'Thời điểm đóng thi không được nằm trong quá khứ.',
        code: 'ERR_INVALID_SCHEDULE_TIME',
      });
    }
  }

  /**
   * Xuất bản đề thi (Draft -> Published). Thực thi trong Database Transaction.
   */
  async publish(
    examId: string,
    dto: ChangeExamStatusDto,
    user: AuthenticatedUser,
  ): Promise<ExamPublishResultResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const exam = await manager.findOne(Exam, {
        where: { id: examId, isDeleted: false },
        relations: {
          sections: { part: true },
          questions: {
            section: { part: true },
            question: {
              options: true,
              mediaResources: true,
              questionGroup: {
                mediaResources: true,
              },
            },
          },
        },
      });

      if (!exam) {
        throw new NotFoundException('Không tìm thấy đề thi');
      }

      this.validateAccess(exam, user);

      if (exam.status !== ExamStatus.DRAFT) {
        throw new BadRequestException({
          message: 'Chỉ có thể xuất bản đề thi đang ở trạng thái bản nháp (Draft).',
          code: 'ERR_INVALID_EXAM_STATUS_TRANSITION',
        });
      }

      if (exam.version !== dto.version) {
        throw new ConflictException({
          message: 'Đề thi đã bị thay đổi bởi phiên làm việc khác. Vui lòng làm mới trang.',
          code: 'ERR_CONCURRENCY_CONFLICT',
        });
      }

      // Kích hoạt thẩm định toàn vẹn
      await this.validatePublishChecklist(exam, manager);

      exam.status = ExamStatus.PUBLISHED;
      exam.publishedAt = new Date();
      exam.version = exam.version + 1;

      const savedExam = await manager.save(Exam, exam);
      return this.mapToResultDto(savedExam);
    });
  }

  /**
   * Chuyển đề thi đã xuất bản về lại bản nháp (Published -> Draft).
   * Unpublish Guard: Chặn ném lỗi nếu đã có học viên nộp bài.
   */
  async unpublish(
    examId: string,
    dto: ChangeExamStatusDto,
    user: AuthenticatedUser,
  ): Promise<ExamPublishResultResponseDto> {
    const exam = await this.examRepo.findOne({
      where: { id: examId, isDeleted: false },
    });

    if (!exam) {
      throw new NotFoundException('Không tìm thấy đề thi');
    }

    this.validateAccess(exam, user);

    if (exam.status !== ExamStatus.PUBLISHED) {
      throw new BadRequestException({
        message:
          'Chỉ có thể chuyển về bản nháp đối với đề thi đang ở trạng thái đã xuất bản (Published).',
        code: 'ERR_INVALID_EXAM_STATUS_TRANSITION',
      });
    }

    if (exam.version !== dto.version) {
      throw new ConflictException({
        message: 'Đề thi đã bị thay đổi bởi phiên làm việc khác. Vui lòng làm mới trang.',
        code: 'ERR_CONCURRENCY_CONFLICT',
      });
    }

    const attemptsCount = await this.getAttemptsCount(exam.id);
    if (attemptsCount > 0) {
      throw new ConflictException({
        message:
          'Đề thi đã có học viên tham gia, không thể chuyển về bản nháp. Vui lòng đóng đề hoặc tạo đề thi mới.',
        code: 'ERR_EXAM_HAS_ATTEMPTS',
      });
    }

    exam.status = ExamStatus.DRAFT;
    exam.publishedAt = null;
    exam.version = exam.version + 1;

    const savedExam = await this.examRepo.save(exam);
    return this.mapToResultDto(savedExam);
  }

  /**
   * Đóng đề thi thủ công (Published -> Closed).
   */
  async close(
    examId: string,
    dto: ChangeExamStatusDto,
    user: AuthenticatedUser,
  ): Promise<ExamPublishResultResponseDto> {
    const exam = await this.examRepo.findOne({
      where: { id: examId, isDeleted: false },
    });

    if (!exam) {
      throw new NotFoundException('Không tìm thấy đề thi');
    }

    this.validateAccess(exam, user);

    if (exam.status !== ExamStatus.PUBLISHED) {
      throw new BadRequestException({
        message: 'Chỉ có thể đóng đề thi đang ở trạng thái đã xuất bản (Published).',
        code: 'ERR_INVALID_EXAM_STATUS_TRANSITION',
      });
    }

    if (exam.version !== dto.version) {
      throw new ConflictException({
        message: 'Đề thi đã bị thay đổi bởi phiên làm việc khác. Vui lòng làm mới trang.',
        code: 'ERR_CONCURRENCY_CONFLICT',
      });
    }

    exam.status = ExamStatus.CLOSED;
    exam.version = exam.version + 1;

    const savedExam = await this.examRepo.save(exam);
    return this.mapToResultDto(savedExam);
  }

  /**
   * Lưu trữ đề thi (Closed hoặc Draft -> Archived).
   */
  async archive(
    examId: string,
    dto: ChangeExamStatusDto,
    user: AuthenticatedUser,
  ): Promise<ExamPublishResultResponseDto> {
    const exam = await this.examRepo.findOne({
      where: { id: examId, isDeleted: false },
    });

    if (!exam) {
      throw new NotFoundException('Không tìm thấy đề thi');
    }

    this.validateAccess(exam, user);

    if (exam.status === ExamStatus.PUBLISHED) {
      throw new BadRequestException({
        message:
          'Không thể lưu trữ đề thi đang mở (Published). Vui lòng đóng đề thi trước khi lưu trữ.',
        code: 'ERR_INVALID_EXAM_STATUS_TRANSITION',
      });
    }

    if (exam.version !== dto.version) {
      throw new ConflictException({
        message: 'Đề thi đã bị thay đổi bởi phiên làm việc khác. Vui lòng làm mới trang.',
        code: 'ERR_CONCURRENCY_CONFLICT',
      });
    }

    exam.status = ExamStatus.ARCHIVED;
    exam.version = exam.version + 1;

    const savedExam = await this.examRepo.save(exam);
    return this.mapToResultDto(savedExam);
  }

  /**
   * Cronjob tự động đóng đề thi theo lịch (PMR 008, PMR 013).
   * Chạy định kỳ mỗi 5 phút, thực thi batch update bằng single SQL UPDATE.
   */
  @Cron('0 */5 * * * *')
  async handleScheduledExamClosure(): Promise<number> {
    const now = new Date();
    const result = await this.examRepo
      .createQueryBuilder()
      .update(Exam)
      .set({
        status: ExamStatus.CLOSED,
        version: () => 'version + 1',
        updatedAt: now,
      })
      .where('status = :status', { status: ExamStatus.PUBLISHED })
      .andWhere('close_at IS NOT NULL')
      .andWhere('close_at <= :now', { now })
      .andWhere('is_deleted = false')
      .execute();

    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.log(`[ScheduledClosure] Đã tự động đóng ${affected} đề thi hết hạn theo lịch.`);
    }
    return affected;
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

  private mapToResultDto(exam: Exam): ExamPublishResultResponseDto {
    const isScheduled = Boolean(
      exam.status === ExamStatus.PUBLISHED && exam.openAt && new Date() < new Date(exam.openAt),
    );

    return {
      id: exam.id,
      title: exam.title,
      status: exam.status,
      version: exam.version,
      isScheduled,
      openAt: exam.openAt,
      closeAt: exam.closeAt,
      publishedAt: exam.publishedAt,
      updatedAt: exam.updatedAt,
    };
  }
}
