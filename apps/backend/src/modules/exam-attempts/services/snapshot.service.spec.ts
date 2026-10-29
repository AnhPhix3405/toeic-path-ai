import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SnapshotService } from './snapshot.service';
import { Exam } from '../../exams/entities/exam.entity';
import { ExamType } from '../../exams/enums/exam-type.enum';
import { ExamStatus } from '../../exams/enums/exam-status.enum';

describe('SnapshotService', () => {
  let service: SnapshotService;
  let dataSourceMock: any;

  const mockExam: Exam = {
    id: '30000000-0000-4000-8000-000000000001',
    title: 'ETS TOEIC Test 01',
    description: 'Test description',
    type: ExamType.FULL_TEST,
    durationMinutes: 120,
    maxAttempts: 3,
    passingScore: 600,
    openAt: null,
    closeAt: null,
    allowPartPractice: true,
    isShuffledQuestions: false,
    isShuffledOptions: false,
    scoreConversionType: 'DEFAULT_ETS' as any,
    status: ExamStatus.PUBLISHED,
    publishedAt: new Date(),
    version: 1,
    isDeleted: false,
    deletedAt: null,
    createdBy: 'user-1',
    creator: null as any,
    sections: [],
    questions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQuestionsRaw = [
    {
      id: 'eq-1',
      examId: mockExam.id,
      orderIndex: 1,
      questionGroupId: null,
      groupOrder: null,
      section: {
        part: { partNumber: 1 },
      },
      question: {
        id: 'q-1',
        content: null,
        audioUrl: 'https://storage/audio1.mp3',
        imageUrl: 'https://storage/img1.png',
        questionType: 'single_choice',
        questionGroup: null,
        options: [
          { id: 'opt-1-1', label: 'A', content: null, isCorrect: true, position: 1 },
          { id: 'opt-1-2', label: 'B', content: null, isCorrect: false, position: 2 },
          { id: 'opt-1-3', label: 'C', content: null, isCorrect: false, position: 3 },
          { id: 'opt-1-4', label: 'D', content: null, isCorrect: false, position: 4 },
        ],
      },
    },
    {
      id: 'eq-2',
      examId: mockExam.id,
      orderIndex: 32,
      questionGroupId: 'grp-1',
      groupOrder: 1,
      section: {
        part: { partNumber: 3 },
      },
      question: {
        id: 'q-32',
        content: 'Where are the speakers?',
        audioUrl: null,
        imageUrl: null,
        questionType: 'single_choice',
        questionGroup: {
          id: 'grp-1',
          title: 'Conversation 1',
          context: 'Audio passage...',
        },
        options: [
          { id: 'opt-32-1', label: 'A', content: 'At a bank', isCorrect: false, position: 1 },
          { id: 'opt-32-2', label: 'B', content: 'At an airport', isCorrect: true, position: 2 },
        ],
      },
    },
    {
      id: 'eq-3',
      examId: mockExam.id,
      orderIndex: 33,
      questionGroupId: 'grp-1',
      groupOrder: 2,
      section: {
        part: { partNumber: 3 },
      },
      question: {
        id: 'q-33',
        content: 'What will the man do next?',
        audioUrl: null,
        imageUrl: null,
        questionType: 'single_choice',
        questionGroup: {
          id: 'grp-1',
          title: 'Conversation 1',
          context: 'Audio passage...',
        },
        options: [
          { id: 'opt-33-1', label: 'A', content: 'Call back', isCorrect: true, position: 1 },
          { id: 'opt-33-2', label: 'B', content: 'Send email', isCorrect: false, position: 2 },
        ],
      },
    },
  ];

  beforeEach(async () => {
    dataSourceMock = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          addOrderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(mockQuestionsRaw),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SnapshotService, { provide: DataSource, useValue: dataSourceMock }],
    }).compile();

    service = module.get<SnapshotService>(SnapshotService);
  });

  it('should create snapshot with normalized orderIndex 1..N and originalQuestionNumber', async () => {
    const result = await service.createSnapshot(mockExam);

    expect(result.totalQuestions).toBe(3);
    expect(result.shuffledQuestions[0].orderIndex).toBe(1);
    expect(result.shuffledQuestions[0].originalQuestionNumber).toBe(1);

    expect(result.shuffledQuestions[1].orderIndex).toBe(2);
    expect(result.shuffledQuestions[1].originalQuestionNumber).toBe(32);

    expect(result.shuffledQuestions[2].orderIndex).toBe(3);
    expect(result.shuffledQuestions[2].originalQuestionNumber).toBe(33);
  });

  it('should extract answerKeySnapshot with correctOptionId and enforce Zero Answer Leakage in shuffledQuestions', async () => {
    const result = await service.createSnapshot(mockExam);

    expect(result.answerKeySnapshot['q-1']).toBe('opt-1-1');
    expect(result.answerKeySnapshot['q-32']).toBe('opt-32-2');
    expect(result.answerKeySnapshot['q-33']).toBe('opt-33-1');

    // Zero leakage check: no isCorrect in shuffledQuestions options
    result.shuffledQuestions.forEach((q) => {
      q.options.forEach((opt: any) => {
        expect(opt.isCorrect).toBeUndefined();
      });
    });
  });

  it('should re-label options (A, B, C, D) and position (1..4) after shuffling options (PMR 021)', async () => {
    const examWithShuffleOptions = { ...mockExam, isShuffledOptions: true };
    const result = await service.createSnapshot(examWithShuffleOptions);

    const q1 = result.shuffledQuestions[0];
    expect(q1.options[0].label).toBe('A');
    expect(q1.options[0].position).toBe(1);
    expect(q1.options[1].label).toBe('B');
    expect(q1.options[1].position).toBe(2);
    expect(q1.options[2].label).toBe('C');
    expect(q1.options[2].position).toBe(3);
    expect(q1.options[3].label).toBe('D');
    expect(q1.options[3].position).toBe(4);
  });

  it('should preserve QuestionGroup Integrity when isShuffledQuestions is true', async () => {
    const examWithShuffleQuestions = { ...mockExam, isShuffledQuestions: true };
    const result = await service.createSnapshot(examWithShuffleQuestions);

    // q-32 and q-33 belong to grp-1, they must stay consecutive in groupOrder
    const idx32 = result.shuffledQuestions.findIndex((q) => q.id === 'q-32');
    const idx33 = result.shuffledQuestions.findIndex((q) => q.id === 'q-33');
    expect(Math.abs(idx32 - idx33)).toBe(1);
    expect(idx33).toBeGreaterThan(idx32);
  });
});
