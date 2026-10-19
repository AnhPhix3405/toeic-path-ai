import { ExamType } from '../enums/exam-type.enum';
import { ExamStatus } from '../enums/exam-status.enum';
import { ScoreConversionType } from '../enums/score-conversion-type.enum';
import { Exam } from './exam.entity';
import { ExamSection } from './exam-section.entity';
import { ExamQuestion } from './exam-question.entity';

describe('Sprint 5 Exams Enums & Entities', () => {
  describe('Enums Definition', () => {
    it('should have all 3 ExamType values', () => {
      expect(ExamType.FULL_TEST).toBe('full_test');
      expect(ExamType.MINI_TEST).toBe('mini_test');
      expect(ExamType.PLACEMENT_TEST).toBe('placement_test');
    });

    it('should have only 4 database ExamStatus values (no scheduled enum in DB)', () => {
      expect(ExamStatus.DRAFT).toBe('draft');
      expect(ExamStatus.PUBLISHED).toBe('published');
      expect(ExamStatus.CLOSED).toBe('closed');
      expect(ExamStatus.ARCHIVED).toBe('archived');
      expect(Object.keys(ExamStatus)).toHaveLength(4);
    });

    it('should have all 3 ScoreConversionType values', () => {
      expect(ScoreConversionType.DEFAULT_ETS).toBe('DEFAULT_ETS');
      expect(ScoreConversionType.CUSTOM).toBe('CUSTOM');
      expect(ScoreConversionType.RAW_PERCENTAGE).toBe('RAW_PERCENTAGE');
    });
  });

  describe('Entities Instantiation', () => {
    it('should instantiate Exam with default values and version column', () => {
      const exam = new Exam();
      exam.id = '30000000-0000-4000-8000-000000000001';
      exam.title = 'ETS TOEIC 2026 Test 01';
      exam.type = ExamType.FULL_TEST;
      exam.durationMinutes = 120;
      exam.status = ExamStatus.DRAFT;
      exam.version = 1;
      exam.allowPartPractice = true;
      exam.isShuffledQuestions = false;
      exam.isShuffledOptions = false;
      exam.scoreConversionType = ScoreConversionType.DEFAULT_ETS;
      exam.isDeleted = false;
      exam.sections = [];
      exam.questions = [];

      expect(exam.id).toBeDefined();
      expect(exam.version).toBe(1);
      expect(exam.allowPartPractice).toBe(true);
      expect(exam.status).toBe(ExamStatus.DRAFT);
    });

    it('should instantiate ExamSection with targetDurationMinutes', () => {
      const section = new ExamSection();
      section.id = '31000000-0000-4000-8000-000000000001';
      section.examId = '30000000-0000-4000-8000-000000000001';
      section.partId = '20000000-0000-4000-8000-000000000005';
      section.targetQuestionsCount = 30;
      section.targetDurationMinutes = 12;

      expect(section.targetQuestionsCount).toBe(30);
      expect(section.targetDurationMinutes).toBe(12);
    });

    it('should instantiate ExamQuestion with denormalized group fields, orderIndex, and timestamps', () => {
      const eq = new ExamQuestion();
      eq.id = '32000000-0000-4000-8000-000000000001';
      eq.examId = '30000000-0000-4000-8000-000000000001';
      eq.examSectionId = '31000000-0000-4000-8000-000000000001';
      eq.questionId = '10000000-0000-4000-8000-000000000001';
      eq.questionGroupId = '11000000-0000-4000-8000-000000000001';
      eq.groupOrder = 1;
      eq.orderIndex = 32;
      eq.createdAt = new Date();
      eq.updatedAt = new Date();

      expect(eq.orderIndex).toBe(32);
      expect(eq.questionGroupId).toBeDefined();
      expect(eq.groupOrder).toBe(1);
      expect(eq.updatedAt).toBeDefined();
    });
  });
});
