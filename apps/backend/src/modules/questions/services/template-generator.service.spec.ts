import { Test, TestingModule } from '@nestjs/testing';
import * as ExcelJS from 'exceljs';
import { TemplateGeneratorService } from './template-generator.service';

describe('TemplateGeneratorService', () => {
  let service: TemplateGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateGeneratorService],
    }).compile();

    service = module.get<TemplateGeneratorService>(TemplateGeneratorService);
  });

  it('should generate valid excel template with 2 sheets and correct 15 columns', async () => {
    const result = await service.generateQuestionsTemplate();
    expect(result.fileName).toBe('toeic_questions_template.xlsx');
    expect(result.mimeType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.buffer);

    const dataSheet = workbook.getWorksheet('Questions_Template');
    const guideSheet = workbook.getWorksheet('Instructions_Guide');

    expect(dataSheet).toBeDefined();
    expect(guideSheet).toBeDefined();

    const expectedHeaders = [
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

    const actualHeaders = dataSheet!.getRow(1).values as string[];
    expectedHeaders.forEach((header, index) => {
      expect(actualHeaders[index + 1]).toBe(header);
    });
  });
});
