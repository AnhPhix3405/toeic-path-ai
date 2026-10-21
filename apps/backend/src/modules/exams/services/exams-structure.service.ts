import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { Exam } from '../entities/exam.entity';
import { ExamSection } from '../entities/exam-section.entity';
import { ExamQuestion } from '../entities/exam-question.entity';
import { ToeicPart } from '../../questions/entities/toeic-part.entity';
import { Question } from '../../questions/entities/question.entity';
import { QuestionGroup } from '../../question-groups/entities/question-group.entity';
import { ConfigureExamSectionsDto } from '../dto/request/configure-exam-sections.dto';
import { AddExamQuestionsDto } from '../dto/request/add-exam-questions.dto';
import { ReorderExamQuestionsDto } from '../dto/request/reorder-exam-questions.dto';
import { AutoGenerateExamDto } from '../dto/request/auto-generate-exam.dto';
import {
  ExamQuestionResponseDto,
  ExamStructureResponseDto,
} from '../dto/response/exam-structure-response.dto';
import { ExamSectionResponseDto } from '../dto/response/exam-detail-response.dto';
import { ExamType } from '../enums/exam-type.enum';
import { ExamStatus } from '../enums/exam-status.enum';
import { QuestionStatus } from '../../questions/enums/question-status.enum';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class ExamsStructureService {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepo: Repository<Exam>,
    @InjectRepository(ExamSection)
    private readonly sectionRepo: Repository<ExamSection>,
    @InjectRepository(ExamQuestion)
    private readonly questionRepo: Repository<ExamQuestion>,
    @InjectRepository(ToeicPart)
    private readonly toeicPartRepo: Repository<ToeicPart>,
    @InjectRepository(Question)
    private readonly bankQuestionRepo: Repository<Question>,
    @InjectRepository(QuestionGroup)
    private readonly questionGroupRepo: Repository<QuestionGroup>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Helper kiểm tra quyền truy cập và trạng thái Draft của đề thi kèm Optimistic Locking
   */
  async verifyExamDraftAndAccess(
    manager: EntityManager,
    examId: string,
    user: AuthenticatedUser,
    expectedVersion?: number,
  ): Promise<Exam> {
    const exam = await manager.findOne(Exam, {
      where: { id: examId, isDeleted: false },
    });

    if (!exam) {
      throw new NotFoundException('Không tìm thấy đề thi');
    }

    if (user.role !== UserRole.ADMIN && exam.createdBy !== user.id) {
      throw new ForbiddenException({
        message: 'Bạn không có quyền thao tác trên đề thi này.',
        code: 'ERR_FORBIDDEN_EXAM_ACCESS',
      });
    }

    if (exam.status !== ExamStatus.DRAFT) {
      throw new BadRequestException({
        message: 'Chỉ cho phép thay đổi cấu trúc đề thi khi đề ở trạng thái Bản nháp (Draft).',
        code: 'ERR_EXAM_ALREADY_PUBLISHED',
      });
    }

    if (expectedVersion !== undefined && exam.version !== expectedVersion) {
      throw new ConflictException({
        message: 'Đề thi đã bị thay đổi bởi phiên làm việc khác. Vui lòng làm mới trang.',
        code: 'ERR_CONCURRENCY_CONFLICT',
      });
    }

    return exam;
  }

  /**
   * Cấu hình danh sách Section và chỉ tiêu câu hỏi cho Mini/Placement Test (UC17)
   */
  async configureSections(
    examId: string,
    dto: ConfigureExamSectionsDto,
    user: AuthenticatedUser,
  ): Promise<ExamStructureResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const exam = await this.verifyExamDraftAndAccess(manager, examId, user, dto.version);

      if (exam.type === ExamType.FULL_TEST) {
        throw new BadRequestException({
          message:
            'Đề thi Full Test bắt buộc tuân thủ cố định 7 Part chuẩn TOEIC, không thể tùy biến cấu hình sections.',
          code: 'ERR_FULL_TEST_SECTIONS_IMMUTABLE',
        });
      }

      if (exam.type === ExamType.PLACEMENT_TEST) {
        const totalQuestions = dto.sections.reduce((sum, s) => sum + s.targetQuestionsCount, 0);
        if (totalQuestions < 20 || totalQuestions > 100) {
          throw new BadRequestException({
            message: 'Cấu hình Placement Test phải có tổng số câu hỏi từ 20 đến 100 câu.',
            code: 'ERR_INVALID_PLACEMENT_TEST_STRUCTURE',
          });
        }

        const hasListening = dto.sections.some((s) => s.partNumber >= 1 && s.partNumber <= 4);
        const hasReading = dto.sections.some((s) => s.partNumber >= 5 && s.partNumber <= 7);
        if (!hasListening || !hasReading) {
          throw new BadRequestException({
            message:
              'Placement Test bắt buộc phải bao gồm cả phần Listening (Part 1-4) và Reading (Part 5-7).',
            code: 'ERR_INVALID_PLACEMENT_TEST_STRUCTURE',
          });
        }
      }

      const allParts = await manager.find(ToeicPart, { order: { partNumber: 'ASC' } });
      const partMap = new Map<number, ToeicPart>(allParts.map((p) => [p.partNumber, p]));

      for (const sectionDto of dto.sections) {
        if (!partMap.has(sectionDto.partNumber)) {
          throw new UnprocessableEntityException({
            message: `Không tìm thấy thông tin TOEIC Part ${sectionDto.partNumber} trong hệ thống.`,
            code: 'ERR_TOEIC_PARTS_INCOMPLETE',
          });
        }
      }

      // Xóa cấu hình section cũ và chèn mới
      await manager.delete(ExamSection, { examId: exam.id });

      const newSections = dto.sections.map((item) => {
        const part = partMap.get(item.partNumber)!;
        return manager.create(ExamSection, {
          examId: exam.id,
          partId: part.id,
          part,
          targetQuestionsCount: item.targetQuestionsCount,
          targetDurationMinutes: item.targetDurationMinutes ?? null,
        });
      });

      await manager.save(ExamSection, newSections);

      exam.version = exam.version + 1;
      await manager.save(Exam, exam);

      return this.getStructureInternal(exam.id, user, manager);
    });
  }

  /**
   * Thêm câu hỏi đơn lẻ hoặc nhóm câu hỏi vào một Section của đề thi (UC17)
   */
  async addQuestions(
    examId: string,
    dto: AddExamQuestionsDto,
    user: AuthenticatedUser,
  ): Promise<ExamStructureResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const exam = await this.verifyExamDraftAndAccess(manager, examId, user, dto.version);

      // Kiểm tra chéo quyền sở hữu section (PMR 012)
      const section = await manager.findOne(ExamSection, {
        where: { id: dto.sectionId, examId: exam.id },
        relations: { part: true },
      });

      if (!section) {
        throw new BadRequestException({
          message: 'Phần thi (section) không tồn tại hoặc không thuộc đề thi này.',
          code: 'ERR_SECTION_NOT_FOUND',
        });
      }

      const hasQuestions = dto.questionIds && dto.questionIds.length > 0;
      const hasGroups = dto.questionGroupIds && dto.questionGroupIds.length > 0;

      if (!hasQuestions && !hasGroups) {
        throw new BadRequestException({
          message: 'Cần cung cấp ít nhất một câu hỏi hoặc nhóm câu hỏi.',
          code: 'ERR_EMPTY_QUESTION_SELECTION',
        });
      }

      const candidates: {
        questionId: string;
        questionGroupId: string | null;
        groupOrder: number | null;
      }[] = [];

      // 1. Tuyển chọn câu hỏi đơn lẻ (questionIds)
      if (hasQuestions) {
        const singleQuestions = await manager.find(Question, {
          where: { id: In(dto.questionIds!) },
        });

        if (singleQuestions.length !== dto.questionIds!.length) {
          throw new BadRequestException({
            message: 'Một hoặc nhiều câu hỏi không tồn tại trong hệ thống.',
            code: 'ERR_QUESTION_NOT_FOUND',
          });
        }

        // Chặn lỗ hổng xé nhóm ngầm (PMR 012)
        const hasGroupQuestion = singleQuestions.some((q) => q.questionGroupId !== null);
        if (hasGroupQuestion) {
          throw new BadRequestException({
            message:
              'Không thể thêm câu hỏi nhóm dưới dạng câu hỏi đơn lẻ. Vui lòng thêm qua questionGroupIds.',
            code: 'ERR_INVALID_GROUP_INTEGRITY',
          });
        }

        if (singleQuestions.some((q) => q.status !== QuestionStatus.PUBLISHED)) {
          throw new BadRequestException({
            message: 'Chỉ cho phép thêm câu hỏi đã được phê duyệt xuất bản (published).',
            code: 'ERR_QUESTION_NOT_PUBLISHED',
          });
        }

        if (singleQuestions.some((q) => q.partId !== section.partId)) {
          throw new BadRequestException({
            message: 'Câu hỏi không thuộc đúng Part của phần thi này.',
            code: 'ERR_INVALID_GROUP_INTEGRITY',
          });
        }

        for (const q of singleQuestions) {
          candidates.push({
            questionId: q.id,
            questionGroupId: null,
            groupOrder: null,
          });
        }
      }

      // 2. Tuyển chọn nguyên khối nhóm câu hỏi (questionGroupIds)
      if (hasGroups) {
        const groups = await manager.find(QuestionGroup, {
          where: { id: In(dto.questionGroupIds!) },
          relations: { questions: { part: true } },
        });

        if (groups.length !== dto.questionGroupIds!.length) {
          throw new BadRequestException({
            message: 'Một hoặc nhiều nhóm câu hỏi không tồn tại trong hệ thống.',
            code: 'ERR_GROUP_NOT_FOUND',
          });
        }

        for (const group of groups) {
          const sortedQuestions = [...(group.questions ?? [])].sort(
            (a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0),
          );

          if (sortedQuestions.length === 0) {
            throw new BadRequestException({
              message: `Nhóm câu hỏi ${group.id} không chứa câu hỏi con nào.`,
              code: 'ERR_EMPTY_GROUP',
            });
          }

          if (sortedQuestions.some((q) => q.status !== QuestionStatus.PUBLISHED)) {
            throw new BadRequestException({
              message:
                'Tất cả câu hỏi trong nhóm bắt buộc phải được phê duyệt xuất bản (published).',
              code: 'ERR_QUESTION_NOT_PUBLISHED',
            });
          }

          if (sortedQuestions.some((q) => q.partId !== section.partId)) {
            throw new BadRequestException({
              message: 'Nhóm câu hỏi không thuộc đúng Part của phần thi này.',
              code: 'ERR_INVALID_GROUP_INTEGRITY',
            });
          }

          for (const q of sortedQuestions) {
            candidates.push({
              questionId: q.id,
              questionGroupId: group.id,
              groupOrder: q.groupOrder ?? null,
            });
          }
        }
      }

      // 3. Kiểm tra trùng lặp trong đề thi
      const existingQuestions = await manager.find(ExamQuestion, {
        where: { examId: exam.id },
        select: { questionId: true },
      });
      const existingSet = new Set(existingQuestions.map((e) => e.questionId));
      const candidateSet = new Set<string>();

      for (const candidate of candidates) {
        if (existingSet.has(candidate.questionId) || candidateSet.has(candidate.questionId)) {
          throw new ConflictException({
            message: 'Có câu hỏi đã tồn tại trong đề thi.',
            code: 'ERR_DUPLICATE_EXAM_QUESTION',
          });
        }
        candidateSet.add(candidate.questionId);
      }

      // 4. Xác định start orderIndex
      const maxOrderResult = await manager
        .createQueryBuilder(ExamQuestion, 'eq')
        .where('eq.examId = :examId', { examId: exam.id })
        .select('MAX(eq.orderIndex)', 'max')
        .getRawOne<{ max: number | string | null }>();
      const maxVal = maxOrderResult?.max;
      const nextOrder = (maxVal ? Number(maxVal) : 0) + 1;

      // 5. Lưu các ExamQuestion
      const newExamQuestions = candidates.map((candidate, idx) =>
        manager.create(ExamQuestion, {
          examId: exam.id,
          examSectionId: section.id,
          questionId: candidate.questionId,
          questionGroupId: candidate.questionGroupId,
          groupOrder: candidate.groupOrder,
          orderIndex: nextOrder + idx,
        }),
      );

      await manager.save(ExamQuestion, newExamQuestions);

      exam.version = exam.version + 1;
      await manager.save(Exam, exam);

      return this.getStructureInternal(exam.id, user, manager);
    });
  }

  /**
   * Hoán vị và sắp xếp lại thứ tự order_index các câu hỏi trong đề thi (UC17)
   */
  async reorderQuestions(
    examId: string,
    dto: ReorderExamQuestionsDto,
    user: AuthenticatedUser,
  ): Promise<ExamStructureResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const exam = await this.verifyExamDraftAndAccess(manager, examId, user, dto.version);

      const currentQuestions = await manager.find(ExamQuestion, {
        where: { examId: exam.id },
      });

      if (dto.items.length !== currentQuestions.length) {
        throw new BadRequestException({
          message: 'Danh sách sắp xếp phải chứa đúng và đủ toàn bộ câu hỏi của đề thi.',
          code: 'ERR_INVALID_GROUP_INTEGRITY',
        });
      }

      const currentMap = new Map<string, ExamQuestion>(
        currentQuestions.map((q) => [q.questionId, q]),
      );

      for (const item of dto.items) {
        if (!currentMap.has(item.questionId)) {
          throw new BadRequestException({
            message: 'Có câu hỏi không thuộc đề thi này.',
            code: 'ERR_INVALID_GROUP_INTEGRITY',
          });
        }
      }

      // Kiểm tra orderIndex là hoán vị hợp lệ 1..N
      const sortedOrders = dto.items.map((it) => it.orderIndex).sort((a, b) => a - b);
      for (let i = 0; i < sortedOrders.length; i++) {
        if (sortedOrders[i] !== i + 1) {
          throw new BadRequestException({
            message: 'Thứ tự orderIndex phải là dãy hoán vị liên tục từ 1 đến N.',
            code: 'ERR_INVALID_GROUP_INTEGRITY',
          });
        }
      }

      // Kiểm tra bảo toàn nhóm câu hỏi (PMR 012)
      const itemOrderMap = new Map<string, number>(
        dto.items.map((it) => [it.questionId, it.orderIndex]),
      );

      const groupMap = new Map<string, ExamQuestion[]>();
      for (const q of currentQuestions) {
        if (q.questionGroupId) {
          const list = groupMap.get(q.questionGroupId) ?? [];
          list.push(q);
          groupMap.set(q.questionGroupId, list);
        }
      }

      for (const [, questions] of groupMap.entries()) {
        questions.sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0));
        const orders = questions.map((q) => itemOrderMap.get(q.questionId)!);

        for (let i = 0; i < orders.length - 1; i++) {
          if (orders[i + 1] !== orders[i] + 1) {
            throw new BadRequestException({
              message:
                'Thứ tự sắp xếp vi phạm tính toàn vẹn của nhóm câu hỏi (bị xé nhóm hoặc sai thứ tự nội bộ).',
              code: 'ERR_INVALID_GROUP_INTEGRITY',
            });
          }
        }
      }

      // Tận dụng DEFERRABLE INITIALLY DEFERRED cập nhật order_index
      for (const item of dto.items) {
        await manager.update(
          ExamQuestion,
          { examId: exam.id, questionId: item.questionId },
          { orderIndex: item.orderIndex },
        );
      }

      exam.version = exam.version + 1;
      await manager.save(Exam, exam);

      return this.getStructureInternal(exam.id, user, manager);
    });
  }

  /**
   * Gỡ bỏ câu hỏi đơn lẻ hoặc nguyên khối nhóm câu hỏi kèm dồn lại thứ tự 1..N (UC17)
   */
  async removeQuestion(
    examId: string,
    questionId: string,
    version: number,
    user: AuthenticatedUser,
  ): Promise<ExamStructureResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const exam = await this.verifyExamDraftAndAccess(manager, examId, user, version);

      const target = await manager.findOne(ExamQuestion, {
        where: { examId: exam.id, questionId },
      });

      if (!target) {
        throw new NotFoundException('Không tìm thấy câu hỏi trong đề thi.');
      }

      if (target.questionGroupId) {
        await manager.delete(ExamQuestion, {
          examId: exam.id,
          questionGroupId: target.questionGroupId,
        });
      } else {
        await manager.delete(ExamQuestion, { id: target.id });
      }

      // Dồn lại thứ tự order_index liên tục 1..N
      const remaining = await manager.find(ExamQuestion, {
        where: { examId: exam.id },
        order: { orderIndex: 'ASC' },
      });

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].orderIndex !== i + 1) {
          await manager.update(ExamQuestion, { id: remaining[i].id }, { orderIndex: i + 1 });
        }
      }

      exam.version = exam.version + 1;
      await manager.save(Exam, exam);

      return this.getStructureInternal(exam.id, user, manager);
    });
  }

  /**
   * Thuật toán sinh đề tự động A4 theo ma trận phân bổ độ khó/chỉ tiêu từng Part (UC17)
   */
  async autoGenerate(
    examId: string,
    dto: AutoGenerateExamDto,
    user: AuthenticatedUser,
  ): Promise<ExamStructureResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const exam = await this.verifyExamDraftAndAccess(manager, examId, user, dto.version);

      const sections = await manager.find(ExamSection, {
        where: { examId: exam.id },
        relations: { part: true },
      });

      if (!sections || sections.length === 0) {
        throw new BadRequestException({
          message: 'Đề thi chưa có cấu hình sections. Vui lòng thiết lập cấu hình sections trước.',
          code: 'ERR_EMPTY_SECTIONS',
        });
      }

      sections.sort((a, b) => (a.part?.partNumber ?? 0) - (b.part?.partNumber ?? 0));

      const candidates: {
        examSectionId: string;
        questionId: string;
        questionGroupId: string | null;
        groupOrder: number | null;
      }[] = [];

      for (const section of sections) {
        const partNumber = section.part?.partNumber ?? 0;
        const criteria = dto.criteria?.find((c) => c.partNumber === partNumber);
        const targetCount = criteria?.targetQuestionsCount ?? section.targetQuestionsCount;

        const isGroupPart = [3, 4, 6, 7].includes(partNumber);

        if (!isGroupPart) {
          // Part câu hỏi đơn lẻ (Part 1, 2, 5)
          const availableQuestions = await manager.find(Question, {
            where: {
              partId: section.partId,
              status: QuestionStatus.PUBLISHED,
              questionGroupId: IsNull(),
            },
          });

          if (availableQuestions.length < targetCount) {
            throw new UnprocessableEntityException({
              message: `Ngân hàng câu hỏi không đủ số lượng câu hỏi Part ${partNumber} để sinh đề tự động.`,
              code: 'ERR_QUESTION_BANK_INSUFFICIENT',
              details: {
                partNumber,
                required: targetCount,
                available: availableQuestions.length,
              },
            });
          }

          const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
          const selected = shuffled.slice(0, targetCount);

          for (const q of selected) {
            candidates.push({
              examSectionId: section.id,
              questionId: q.id,
              questionGroupId: null,
              groupOrder: null,
            });
          }
        } else {
          // Part nhóm câu hỏi (Part 3, 4, 6, 7)
          const allGroups = await manager.find(QuestionGroup, {
            relations: { questions: { part: true } },
          });

          const validGroups = allGroups.filter((g) => {
            const qs = g.questions ?? [];
            if (qs.length === 0) return false;
            return qs.every(
              (q) => q.partId === section.partId && q.status === QuestionStatus.PUBLISHED,
            );
          });

          // Giải thuật Knapsack / Greedy Target Matching tránh overshoot (PMR 012)
          const shuffledGroups = [...validGroups].sort(() => 0.5 - Math.random());
          let collectedCount = 0;
          const selectedGroups: QuestionGroup[] = [];

          for (const grp of shuffledGroups) {
            const grpLen = (grp.questions ?? []).length;
            if (collectedCount + grpLen <= targetCount) {
              selectedGroups.push(grp);
              collectedCount += grpLen;
              if (collectedCount === targetCount) {
                break;
              }
            }
          }

          if (collectedCount < targetCount) {
            throw new UnprocessableEntityException({
              message: `Ngân hàng câu hỏi không đủ số lượng câu hỏi/nhóm câu hỏi Part ${partNumber} phù hợp để sinh đề tự động.`,
              code: 'ERR_QUESTION_BANK_INSUFFICIENT',
              details: {
                partNumber,
                required: targetCount,
                collected: collectedCount,
              },
            });
          }

          for (const grp of selectedGroups) {
            const sorted = [...(grp.questions ?? [])].sort(
              (a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0),
            );
            for (const q of sorted) {
              candidates.push({
                examSectionId: section.id,
                questionId: q.id,
                questionGroupId: grp.id,
                groupOrder: q.groupOrder ?? null,
              });
            }
          }
        }
      }

      // Xóa toàn bộ câu hỏi cũ trong đề
      await manager.delete(ExamQuestion, { examId: exam.id });

      // Nạp toàn bộ danh sách câu hỏi mới sinh theo thứ tự 1..N
      const newQuestions = candidates.map((c, idx) =>
        manager.create(ExamQuestion, {
          examId: exam.id,
          examSectionId: c.examSectionId,
          questionId: c.questionId,
          questionGroupId: c.questionGroupId,
          groupOrder: c.groupOrder,
          orderIndex: idx + 1,
        }),
      );

      await manager.save(ExamQuestion, newQuestions);

      exam.version = exam.version + 1;
      await manager.save(Exam, exam);

      return this.getStructureInternal(exam.id, user, manager);
    });
  }

  /**
   * Tra cứu cấu trúc chi tiết của đề thi (Sections và danh sách câu hỏi theo thứ tự)
   */
  async getStructure(examId: string, user: AuthenticatedUser): Promise<ExamStructureResponseDto> {
    return this.getStructureInternal(examId, user);
  }

  /**
   * Internal query method cho getStructure (có thể dùng trong hoặc ngoài transaction)
   */
  private async getStructureInternal(
    examId: string,
    user: AuthenticatedUser,
    manager?: EntityManager,
  ): Promise<ExamStructureResponseDto> {
    const exam = manager
      ? await manager.findOne(Exam, {
          where: { id: examId, isDeleted: false },
          relations: {
            sections: { part: true },
            questions: {
              question: { part: true },
            },
          },
          order: {
            questions: { orderIndex: 'ASC' },
          },
        })
      : await this.examRepo.findOne({
          where: { id: examId, isDeleted: false },
          relations: {
            sections: { part: true },
            questions: {
              question: { part: true },
            },
          },
          order: {
            questions: { orderIndex: 'ASC' },
          },
        });

    if (!exam) {
      throw new NotFoundException('Không tìm thấy đề thi');
    }

    if (
      user.role !== UserRole.ADMIN &&
      exam.createdBy !== user.id &&
      exam.status !== ExamStatus.PUBLISHED
    ) {
      throw new ForbiddenException({
        message: 'Bạn không có quyền truy cập đề thi này.',
        code: 'ERR_FORBIDDEN_EXAM_ACCESS',
      });
    }

    // Đếm số lượng câu hỏi thực tế trong từng section
    const sectionQuestionCountMap = new Map<string, number>();
    for (const eq of exam.questions ?? []) {
      const current = sectionQuestionCountMap.get(eq.examSectionId) ?? 0;
      sectionQuestionCountMap.set(eq.examSectionId, current + 1);
    }

    const sortedSections: ExamSectionResponseDto[] = [...(exam.sections ?? [])]
      .sort((a, b) => (a.part?.partNumber ?? 0) - (b.part?.partNumber ?? 0))
      .map((sec) => ({
        id: sec.id,
        examId: sec.examId,
        partId: sec.partId,
        partNumber: sec.part?.partNumber,
        partName: sec.part?.name,
        targetQuestionsCount: sec.targetQuestionsCount,
        targetDurationMinutes: sec.targetDurationMinutes,
        actualQuestionsCount: sectionQuestionCountMap.get(sec.id) ?? 0,
      }));

    const sortedQuestions: ExamQuestionResponseDto[] = [...(exam.questions ?? [])]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((eq) => ({
        id: eq.id,
        examId: eq.examId,
        examSectionId: eq.examSectionId,
        questionId: eq.questionId,
        orderIndex: eq.orderIndex,
        questionGroupId: eq.questionGroupId,
        groupOrder: eq.groupOrder,
        partNumber: eq.question?.part?.partNumber,
        difficulty: eq.question?.difficulty ?? undefined,
        content: eq.question?.content ?? null,
      }));

    return {
      id: exam.id,
      title: exam.title,
      type: exam.type,
      status: exam.status,
      version: exam.version,
      totalQuestions: sortedQuestions.length,
      sections: sortedSections,
      questions: sortedQuestions,
    };
  }
}
