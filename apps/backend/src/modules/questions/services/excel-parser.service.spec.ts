import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ExcelParserService } from './excel-parser.service';

describe('ExcelParserService', () => {
  let service: ExcelParserService;

  beforeEach(() => {
    service = new ExcelParserService();
  });

  const createWorkbookBuffer = async (rows: any[], headers?: string[]): Promise<Buffer> => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Questions_Template');

    const defaultHeaders = [
      'Part',
      'Question_Text',
      'Option_A',
      'Option_B',
      'Option_C',
      'Option_D',
      'Correct_Answer',
      'Explanation',
      'Difficulty',
      'Topic_Code',
      'Skill_Code',
      'Group_ID',
      'Passage_Code',
      'Passage_Text',
      'Media_Ref',
    ];

    sheet.addRow(headers || defaultHeaders);

    for (const row of rows) {
      sheet.addRow(row);
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  };

  it('should parse valid standalone and grouped questions', async () => {
    const buffer = await createWorkbookBuffer([
      [
        5,
        'Question Part 5',
        'Opt A',
        'Opt B',
        'Opt C',
        'Opt D',
        'A',
        'Exp',
        'easy',
        'TOPIC1',
        'SKILL1',
        '',
        '',
        '',
        '',
      ],
      [
        3,
        'Question Part 3 (1)',
        'Opt A',
        'Opt B',
        'Opt C',
        'Opt D',
        'B',
        'Exp',
        'medium',
        'TOPIC2',
        'SKILL2',
        'GRP_1',
        '',
        'Passage 1',
        'audio.mp3',
      ],
      [
        3,
        'Question Part 3 (2)',
        'Opt A',
        'Opt B',
        'Opt C',
        'Opt D',
        'C',
        'Exp',
        'hard',
        'TOPIC2',
        'SKILL2',
        'GRP_1',
        '',
        '',
        '',
      ],
    ]);

    const result = await service.parseQuestionsExcel(buffer);
    expect(result.totalRows).toBe(3);
    expect(result.errors.length).toBe(0);
    expect(result.standaloneQuestions.length).toBe(1);
    expect(result.groupedQuestions.size).toBe(1);
    expect(result.groupedQuestions.get('GRP_1')?.length).toBe(2);
  });

  it('should correctly count data rows with countTotalDataRows', async () => {
    const buffer = await createWorkbookBuffer([
      [5, 'Q1', 'A', 'B', 'C', 'D', 'A', '', 'easy', '', '', '', '', '', ''],
      [5, 'Q2', 'A', 'B', 'C', 'D', 'B', '', 'medium', '', '', '', '', '', ''],
    ]);

    const count = await service.countTotalDataRows(buffer);
    expect(count).toBe(2);
  });

  it('should catch invalid Part number', async () => {
    const buffer = await createWorkbookBuffer([
      [8, 'Q1', 'A', 'B', 'C', 'D', 'A', '', 'easy', '', '', '', '', '', ''],
    ]);

    const result = await service.parseQuestionsExcel(buffer);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].code).toBe('INVALID_PART');
  });

  it('should catch invalid Correct_Answer', async () => {
    const buffer = await createWorkbookBuffer([
      [5, 'Q1', 'A', 'B', 'C', 'D', 'Z', '', 'easy', '', '', '', '', '', ''],
    ]);

    const result = await service.parseQuestionsExcel(buffer);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].code).toBe('INVALID_CORRECT_ANSWER');
  });

  it('should catch Part 2 having Option D', async () => {
    const buffer = await createWorkbookBuffer([
      [
        2,
        'Part 2 Question',
        'A',
        'B',
        'C',
        'D not allowed',
        'A',
        '',
        'easy',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
    ]);

    const result = await service.parseQuestionsExcel(buffer);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].code).toBe('PART_2_MAX_3_OPTIONS');
  });

  it('should throw BadRequestException if header columns are invalid', async () => {
    const buffer = await createWorkbookBuffer([], ['Part', 'Invalid_Header']);

    await expect(service.parseQuestionsExcel(buffer)).rejects.toThrow(
      new BadRequestException(
        'Cấu trúc tiêu đề tệp Excel không đúng định dạng mẫu 15 cột quy định.',
      ),
    );
  });

  describe('TOEIC Part Matrix Validation (Review Focus 1 & 4)', () => {
    it('should allow empty Question_Text and Options for Part 1', async () => {
      const buffer = await createWorkbookBuffer([
        [1, '', '', '', '', '', 'A', 'Exp', 'easy', '', '', '', '', '', 'photo.mp3'],
      ]);

      const result = await service.parseQuestionsExcel(buffer);
      expect(result.errors).toEqual([]);
      expect(result.standaloneQuestions.length).toBe(1);
      expect(result.standaloneQuestions[0].questionText).toBe('');
      expect(result.standaloneQuestions[0].optionA).toBe('');
    });

    it('should allow empty Question_Text and Options for Part 2 without Option D', async () => {
      const buffer = await createWorkbookBuffer([
        [2, '', '', '', '', '', 'B', 'Exp', 'medium', '', '', '', '', '', 'audio2.mp3'],
      ]);

      const result = await service.parseQuestionsExcel(buffer);
      expect(result.errors).toEqual([]);
      expect(result.standaloneQuestions.length).toBe(1);
      expect(result.standaloneQuestions[0].questionText).toBe('');
    });

    it('should allow empty Question_Text for Part 6 when Group_ID is present, but require options', async () => {
      const buffer = await createWorkbookBuffer([
        [
          6,
          '',
          'apple',
          'banana',
          'cherry',
          'date',
          'A',
          'Exp',
          'hard',
          '',
          '',
          'GRP_6',
          'P1',
          'Passage context',
          '',
        ],
      ]);

      const result = await service.parseQuestionsExcel(buffer);
      expect(result.errors).toEqual([]);
      expect(result.groupedQuestions.get('GRP_6')?.length).toBe(1);
    });

    it('should reject Part 6 with empty options', async () => {
      const buffer = await createWorkbookBuffer([
        [6, '', '', '', '', '', 'A', 'Exp', 'hard', '', '', 'GRP_6', 'P1', 'Passage context', ''],
      ]);

      const result = await service.parseQuestionsExcel(buffer);
      expect(result.errors.some((e) => e.code === 'MISSING_OPTIONS')).toBe(true);
    });

    it('should reject Part 5 with empty Question_Text or empty options', async () => {
      const buffer = await createWorkbookBuffer([
        [5, '', 'A', 'B', 'C', 'D', 'A', '', 'easy', '', '', '', '', '', ''],
      ]);

      const result = await service.parseQuestionsExcel(buffer);
      expect(result.errors.some((e) => e.code === 'MISSING_QUESTION_TEXT')).toBe(true);
    });
  });
});
