import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ExamsStructureService } from './exams-structure.service';
import { Exam } from '../entities/exam.entity';
import { ExamSection } from '../entities/exam-section.entity';
import { ExamQuestion } from '../entities/exam-question.entity';
import { ToeicPart } from '../../questions/entities/toeic-part.entity';
import { Question } from '../../questions/entities/question.entity';
import { QuestionGroup } from '../../question-groups/entities/question-group.entity';
import { ExamType } from '../enums/exam-type.enum';
import { ExamStatus } from '../enums/exam-status.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';

describe('ExamsStructureService - Configure & Get Structure', () => {
  let service: ExamsStructureService;
  let mockExamRepo: Partial<Repository<Exam>>;
  let mockSectionRepo: Partial<Repository<ExamSection>>;
  let mockQuestionRepo: Partial<Repository<ExamQuestion>>;
  let mockToeicPartRepo: Partial<Repository<ToeicPart>>;
  let mockBankQuestionRepo: Partial<Repository<Question>>;
  let mockQuestionGroupRepo: Partial<Repository<QuestionGroup>>;
  let mockDataSource: Partial<DataSource>;
  let mockEntityManager: Partial<EntityManager>;

  const teacherUser: AuthenticatedUser = {
    id: 'user-teacher-01',
    email: 'teacher@test.com',
    role: UserRole.TEACHER,
  };

  const otherUser: AuthenticatedUser = {
    id: 'user-teacher-02',
    email: 'other@test.com',
    role: UserRole.TEACHER,
  };

  const adminUser: AuthenticatedUser = {
    id: 'user-admin-01',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
  };

  const sampleParts: ToeicPart[] = [
    { id: 'part-1', partNumber: 1, name: 'Part 1: Photographs' } as ToeicPart,
    { id: 'part-2', partNumber: 2, name: 'Part 2: Question-Response' } as ToeicPart,
    { id: 'part-3', partNumber: 3, name: 'Part 3: Conversations' } as ToeicPart,
    { id: 'part-4', partNumber: 4, name: 'Part 4: Talks' } as ToeicPart,
    { id: 'part-5', partNumber: 5, name: 'Part 5: Incomplete Sentences' } as ToeicPart,
    { id: 'part-6', partNumber: 6, name: 'Part 6: Text Completion' } as ToeicPart,
    { id: 'part-7', partNumber: 7, name: 'Part 7: Reading Comprehension' } as ToeicPart,
  ];

  beforeEach(() => {
    mockEntityManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((entityClass, plain) => plain),
      save: jest.fn().mockImplementation(async (entityClass, entity) => entity),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb: (em: EntityManager) => any) => {
        return cb(mockEntityManager as EntityManager);
      }),
    };

    mockExamRepo = {
      findOne: jest.fn(),
    };
    mockSectionRepo = {
      find: jest.fn(),
    };
    mockQuestionRepo = {
      find: jest.fn(),
    };
    mockToeicPartRepo = {
      find: jest.fn().mockResolvedValue(sampleParts),
    };
    mockBankQuestionRepo = {};
    mockQuestionGroupRepo = {};

    service = new ExamsStructureService(
      mockExamRepo as Repository<Exam>,
      mockSectionRepo as Repository<ExamSection>,
      mockQuestionRepo as Repository<ExamQuestion>,
      mockToeicPartRepo as Repository<ToeicPart>,
      mockBankQuestionRepo as Repository<Question>,
      mockQuestionGroupRepo as Repository<QuestionGroup>,
      mockDataSource as DataSource,
    );
  });

  describe('configureSections', () => {
    it('should throw NotFoundException if exam does not exist', async () => {
      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.configureSections(
          'exam-not-found',
          { version: 1, sections: [{ partNumber: 1, targetQuestionsCount: 6 }] },
          teacherUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not creator and not admin', async () => {
      const exam = {
        id: 'exam-01',
        createdBy: teacherUser.id,
        isDeleted: false,
        status: ExamStatus.DRAFT,
        version: 1,
      } as Exam;
      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce(exam);

      await expect(
        service.configureSections(
          'exam-01',
          { version: 1, sections: [{ partNumber: 1, targetQuestionsCount: 6 }] },
          otherUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow adminUser to configure sections even if not creator', async () => {
      const exam = {
        id: 'exam-01',
        title: 'Draft Exam',
        type: ExamType.MINI_TEST,
        createdBy: teacherUser.id,
        isDeleted: false,
        status: ExamStatus.DRAFT,
        version: 1,
      } as Exam;
      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce(exam).mockResolvedValueOnce({
        ...exam,
        version: 2,
        sections: [],
        questions: [],
      });
      (mockEntityManager.find as jest.Mock).mockResolvedValueOnce(sampleParts);

      const res = await service.configureSections(
        'exam-01',
        { version: 1, sections: [{ partNumber: 1, targetQuestionsCount: 6 }] },
        adminUser,
      );
      expect(res.version).toBe(2);
    });

    it('should throw BadRequestException (ERR_EXAM_ALREADY_PUBLISHED) if exam is published', async () => {
      const exam = {
        id: 'exam-01',
        createdBy: teacherUser.id,
        isDeleted: false,
        status: ExamStatus.PUBLISHED,
        version: 1,
      } as Exam;
      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce(exam);

      await expect(
        service.configureSections(
          'exam-01',
          { version: 1, sections: [{ partNumber: 1, targetQuestionsCount: 6 }] },
          teacherUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException (ERR_CONCURRENCY_CONFLICT) if version does not match', async () => {
      const exam = {
        id: 'exam-01',
        createdBy: teacherUser.id,
        isDeleted: false,
        status: ExamStatus.DRAFT,
        version: 2,
      } as Exam;
      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce(exam);

      await expect(
        service.configureSections(
          'exam-01',
          { version: 1, sections: [{ partNumber: 1, targetQuestionsCount: 6 }] },
          teacherUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException (ERR_FULL_TEST_SECTIONS_IMMUTABLE) if exam is FULL_TEST', async () => {
      const exam = {
        id: 'exam-01',
        type: ExamType.FULL_TEST,
        createdBy: teacherUser.id,
        isDeleted: false,
        status: ExamStatus.DRAFT,
        version: 1,
      } as Exam;
      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce(exam);

      await expect(
        service.configureSections(
          'exam-01',
          { version: 1, sections: [{ partNumber: 1, targetQuestionsCount: 6 }] },
          teacherUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException (ERR_INVALID_PLACEMENT_TEST_STRUCTURE) for placement test with < 20 questions', async () => {
      const exam = {
        id: 'exam-01',
        type: ExamType.PLACEMENT_TEST,
        createdBy: teacherUser.id,
        isDeleted: false,
        status: ExamStatus.DRAFT,
        version: 1,
      } as Exam;
      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce(exam);

      await expect(
        service.configureSections(
          'exam-01',
          {
            version: 1,
            sections: [
              { partNumber: 1, targetQuestionsCount: 5 },
              { partNumber: 5, targetQuestionsCount: 10 },
            ],
          },
          teacherUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException (ERR_INVALID_PLACEMENT_TEST_STRUCTURE) for placement test missing reading', async () => {
      const exam = {
        id: 'exam-01',
        type: ExamType.PLACEMENT_TEST,
        createdBy: teacherUser.id,
        isDeleted: false,
        status: ExamStatus.DRAFT,
        version: 1,
      } as Exam;
      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce(exam);

      await expect(
        service.configureSections(
          'exam-01',
          {
            version: 1,
            sections: [
              { partNumber: 1, targetQuestionsCount: 10 },
              { partNumber: 2, targetQuestionsCount: 20 },
            ],
          },
          teacherUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully configure sections for MINI_TEST and increment version', async () => {
      const exam = {
        id: 'exam-01',
        title: 'Mini Test 01',
        type: ExamType.MINI_TEST,
        createdBy: teacherUser.id,
        isDeleted: false,
        status: ExamStatus.DRAFT,
        version: 1,
      } as Exam;
      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce(exam);
      (mockEntityManager.find as jest.Mock).mockResolvedValueOnce(sampleParts);

      // Structure query mock
      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce({
        ...exam,
        version: 2,
        sections: [
          {
            id: 'sec-1',
            examId: 'exam-01',
            partId: 'part-1',
            part: sampleParts[0],
            targetQuestionsCount: 6,
            targetDurationMinutes: 10,
          },
        ],
        questions: [],
      });

      const result = await service.configureSections(
        'exam-01',
        {
          version: 1,
          sections: [{ partNumber: 1, targetQuestionsCount: 6, targetDurationMinutes: 10 }],
        },
        teacherUser,
      );

      expect(mockEntityManager.delete).toHaveBeenCalledWith(ExamSection, { examId: 'exam-01' });
      expect(mockEntityManager.save).toHaveBeenCalled();
      expect(result.version).toBe(2);
      expect(result.sections.length).toBe(1);
    });
  });

  describe('getStructure', () => {
    it('should return exam structure with actual questions count and sorted questions', async () => {
      const examWithData = {
        id: 'exam-01',
        title: 'ETS Test 01',
        type: ExamType.FULL_TEST,
        status: ExamStatus.DRAFT,
        version: 1,
        createdBy: teacherUser.id,
        isDeleted: false,
        sections: [
          {
            id: 'sec-1',
            examId: 'exam-01',
            partId: 'part-1',
            part: sampleParts[0],
            targetQuestionsCount: 6,
            targetDurationMinutes: null,
          },
        ],
        questions: [
          {
            id: 'eq-1',
            examId: 'exam-01',
            examSectionId: 'sec-1',
            questionId: 'q-1',
            orderIndex: 1,
            questionGroupId: null,
            groupOrder: null,
            question: {
              id: 'q-1',
              content: 'Photo question 1',
              difficulty: 'easy',
              part: sampleParts[0],
            },
          },
        ],
      };

      (mockExamRepo.findOne as jest.Mock).mockResolvedValueOnce(examWithData);

      const result = await service.getStructure('exam-01', teacherUser);

      expect(result.id).toBe('exam-01');
      expect(result.totalQuestions).toBe(1);
      expect(result.sections[0].actualQuestionsCount).toBe(1);
      expect(result.questions[0].orderIndex).toBe(1);
    });
  });

  describe('addQuestions', () => {
    const draftExam = {
      id: 'exam-01',
      title: 'Draft Exam',
      type: ExamType.FULL_TEST,
      createdBy: teacherUser.id,
      isDeleted: false,
      status: ExamStatus.DRAFT,
      version: 1,
    } as Exam;

    const mockSection = {
      id: 'sec-01',
      examId: 'exam-01',
      partId: 'part-1',
      part: sampleParts[0],
      targetQuestionsCount: 6,
    } as ExamSection;

    it('should throw BadRequestException (ERR_SECTION_NOT_FOUND) if section does not belong to exam', async () => {
      (mockEntityManager.findOne as jest.Mock)
        .mockResolvedValueOnce(draftExam) // exam
        .mockResolvedValueOnce(null); // section not found

      await expect(
        service.addQuestions(
          'exam-01',
          { version: 1, sectionId: 'sec-invalid', questionIds: ['q-1'] },
          teacherUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException (ERR_INVALID_GROUP_INTEGRITY) if question in questionIds has a questionGroupId', async () => {
      (mockEntityManager.findOne as jest.Mock)
        .mockResolvedValueOnce(draftExam)
        .mockResolvedValueOnce(mockSection);

      (mockEntityManager.find as jest.Mock).mockResolvedValueOnce([
        {
          id: 'q-grouped',
          questionGroupId: 'grp-1',
          status: 'published',
          partId: 'part-1',
        },
      ]);

      await expect(
        service.addQuestions(
          'exam-01',
          { version: 1, sectionId: 'sec-01', questionIds: ['q-grouped'] },
          teacherUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException (ERR_QUESTION_NOT_PUBLISHED) if any question is draft', async () => {
      (mockEntityManager.findOne as jest.Mock)
        .mockResolvedValueOnce(draftExam)
        .mockResolvedValueOnce(mockSection);

      (mockEntityManager.find as jest.Mock).mockResolvedValueOnce([
        {
          id: 'q-draft',
          questionGroupId: null,
          status: 'draft',
          partId: 'part-1',
        },
      ]);

      await expect(
        service.addQuestions(
          'exam-01',
          { version: 1, sectionId: 'sec-01', questionIds: ['q-draft'] },
          teacherUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException (ERR_DUPLICATE_EXAM_QUESTION) if question already exists in exam', async () => {
      (mockEntityManager.findOne as jest.Mock)
        .mockResolvedValueOnce(draftExam)
        .mockResolvedValueOnce(mockSection);

      (mockEntityManager.find as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: 'q-existing',
            questionGroupId: null,
            status: 'published',
            partId: 'part-1',
          },
        ]) // single questions
        .mockResolvedValueOnce([{ questionId: 'q-existing' }]); // existing in exam

      await expect(
        service.addQuestions(
          'exam-01',
          { version: 1, sectionId: 'sec-01', questionIds: ['q-existing'] },
          teacherUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully add questions and return updated structure', async () => {
      (mockEntityManager.findOne as jest.Mock)
        .mockResolvedValueOnce(draftExam)
        .mockResolvedValueOnce(mockSection);

      (mockEntityManager.find as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: 'q-new-1',
            questionGroupId: null,
            status: 'published',
            partId: 'part-1',
          },
        ]) // single questions
        .mockResolvedValueOnce([]); // no existing in exam

      mockEntityManager.createQueryBuilder = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: 0 }),
      });

      // getStructure mock
      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce({
        ...draftExam,
        version: 2,
        sections: [mockSection],
        questions: [
          {
            id: 'eq-1',
            examId: 'exam-01',
            examSectionId: 'sec-01',
            questionId: 'q-new-1',
            orderIndex: 1,
            questionGroupId: null,
            groupOrder: null,
          },
        ],
      });

      const res = await service.addQuestions(
        'exam-01',
        { version: 1, sectionId: 'sec-01', questionIds: ['q-new-1'] },
        teacherUser,
      );

      expect(mockEntityManager.save).toHaveBeenCalled();
      expect(res.version).toBe(2);
    });
  });

  describe('reorderQuestions', () => {
    const draftExam = {
      id: 'exam-01',
      title: 'Draft Exam',
      type: ExamType.FULL_TEST,
      createdBy: teacherUser.id,
      isDeleted: false,
      status: ExamStatus.DRAFT,
      version: 1,
    } as Exam;

    it('should throw BadRequestException (ERR_INVALID_GROUP_INTEGRITY) if items count mismatch', async () => {
      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce(draftExam);
      (mockEntityManager.find as jest.Mock).mockResolvedValueOnce([
        { id: 'eq-1', questionId: 'q-1', orderIndex: 1, questionGroupId: null },
        { id: 'eq-2', questionId: 'q-2', orderIndex: 2, questionGroupId: null },
      ]);

      await expect(
        service.reorderQuestions(
          'exam-01',
          { version: 1, items: [{ questionId: 'q-1', orderIndex: 1 }] },
          teacherUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException (ERR_INVALID_GROUP_INTEGRITY) if group questions are separated', async () => {
      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce(draftExam);
      (mockEntityManager.find as jest.Mock).mockResolvedValueOnce([
        { id: 'eq-1', questionId: 'q-1', orderIndex: 1, questionGroupId: 'grp-1', groupOrder: 1 },
        { id: 'eq-2', questionId: 'q-2', orderIndex: 2, questionGroupId: 'grp-1', groupOrder: 2 },
        { id: 'eq-3', questionId: 'q-3', orderIndex: 3, questionGroupId: null, groupOrder: null },
      ]);

      // reorder places q-1 at order 1, q-3 at order 2, q-2 at order 3 -> group split!
      await expect(
        service.reorderQuestions(
          'exam-01',
          {
            version: 1,
            items: [
              { questionId: 'q-1', orderIndex: 1 },
              { questionId: 'q-3', orderIndex: 2 },
              { questionId: 'q-2', orderIndex: 3 },
            ],
          },
          teacherUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeQuestion', () => {
    const draftExam = {
      id: 'exam-01',
      title: 'Draft Exam',
      type: ExamType.FULL_TEST,
      createdBy: teacherUser.id,
      isDeleted: false,
      status: ExamStatus.DRAFT,
      version: 1,
    } as Exam;

    it('should throw NotFoundException if question is not in exam', async () => {
      (mockEntityManager.findOne as jest.Mock)
        .mockResolvedValueOnce(draftExam)
        .mockResolvedValueOnce(null);

      await expect(
        service.removeQuestion('exam-01', 'q-not-in-exam', 1, teacherUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('autoGenerate', () => {
    const draftExam = {
      id: 'exam-01',
      title: 'Draft Exam',
      type: ExamType.FULL_TEST,
      createdBy: teacherUser.id,
      isDeleted: false,
      status: ExamStatus.DRAFT,
      version: 1,
    } as Exam;

    const mockSectionPart1 = {
      id: 'sec-01',
      examId: 'exam-01',
      partId: 'part-1',
      part: sampleParts[0],
      targetQuestionsCount: 6,
    } as ExamSection;

    it('should throw UnprocessableEntityException (ERR_QUESTION_BANK_INSUFFICIENT) if bank has insufficient single questions', async () => {
      (mockEntityManager.findOne as jest.Mock).mockResolvedValueOnce(draftExam);
      (mockEntityManager.find as jest.Mock)
        .mockResolvedValueOnce([mockSectionPart1]) // sections
        .mockResolvedValueOnce([{ id: 'q-1' }]); // available single questions (1 < 6)

      await expect(service.autoGenerate('exam-01', { version: 1 }, teacherUser)).rejects.toThrow();
    });
  });
});
