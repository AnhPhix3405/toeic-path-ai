import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { IMPORT_LIMITS } from '../../../config/import.config';

export interface ParsedQuestionRow {
  rowNumber: number;
  partNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD?: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  topicCode?: string;
  skillCode?: string;
  groupId?: string;
  passageCode?: string;
  passageText?: string;
  mediaRef?: string;
}

export interface ExcelParseError {
  row: number;
  error: string;
  code?: string;
  groupId?: string;
}

export interface ExcelParseResult {
  standaloneQuestions: ParsedQuestionRow[];
  groupedQuestions: Map<string, ParsedQuestionRow[]>;
  totalRows: number;
  errors: ExcelParseError[];
}

const EXPECTED_HEADERS = [
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

@Injectable()
export class ExcelParserService {
  private getCellValue(cell: ExcelJS.Cell): string {
    if (!cell || cell.value === null || cell.value === undefined) {
      return '';
    }
    if (typeof cell.text === 'string' && cell.text !== '') {
      return cell.text.trim();
    }
    const val: unknown = cell.value;
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      return String(val).trim();
    }
    if (val && typeof val === 'object') {
      if ('result' in val) {
        const res = (val as { result?: unknown }).result;
        return typeof res === 'string' || typeof res === 'number' ? String(res).trim() : '';
      }
      if ('richText' in val) {
        const rt = (val as { richText?: Array<{ text?: string }> }).richText;
        if (Array.isArray(rt)) {
          return rt
            .map((t) => t.text ?? '')
            .join('')
            .trim();
        }
      }
    }
    return '';
  }

  private getWorksheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
    const worksheet = workbook.getWorksheet('Questions_Template') || workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Không tìm thấy sheet dữ liệu trong tệp Excel.');
    }
    return worksheet;
  }

  async countTotalDataRows(buffer: Buffer): Promise<number> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = this.getWorksheet(workbook);

    let count = 0;
    const rowCount = worksheet.rowCount;

    for (let r = 2; r <= rowCount; r++) {
      const row = worksheet.getRow(r);
      let hasData = false;
      for (let c = 1; c <= EXPECTED_HEADERS.length; c++) {
        if (this.getCellValue(row.getCell(c)) !== '') {
          hasData = true;
          break;
        }
      }
      if (hasData) {
        count++;
      }
    }
    return count;
  }

  async parseQuestionsExcel(buffer: Buffer): Promise<ExcelParseResult> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as any);
    } catch {
      throw new BadRequestException(
        'Không thể đọc nội dung tệp Excel. Tệp bị hỏng hoặc sai định dạng.',
      );
    }

    const worksheet = this.getWorksheet(workbook);

    // 1. Validate headers
    const headerRow = worksheet.getRow(1);
    const actualHeaders: string[] = [];
    for (let i = 1; i <= EXPECTED_HEADERS.length; i++) {
      actualHeaders.push(this.getCellValue(headerRow.getCell(i)).toLowerCase());
    }

    const isValidHeaders = EXPECTED_HEADERS.every(
      (expected, idx) => actualHeaders[idx] === expected.toLowerCase(),
    );

    if (!isValidHeaders) {
      throw new BadRequestException(
        'Cấu trúc tiêu đề tệp Excel không đúng định dạng mẫu 15 cột quy định.',
      );
    }

    const standaloneQuestions: ParsedQuestionRow[] = [];
    const groupedQuestions = new Map<string, ParsedQuestionRow[]>();
    const errors: ExcelParseError[] = [];
    let totalRows = 0;

    const rowCount = worksheet.rowCount;

    for (let r = 2; r <= rowCount; r++) {
      const row = worksheet.getRow(r);

      // Check if row is completely empty
      let hasAnyValue = false;
      for (let c = 1; c <= EXPECTED_HEADERS.length; c++) {
        if (this.getCellValue(row.getCell(c)) !== '') {
          hasAnyValue = true;
          break;
        }
      }
      if (!hasAnyValue) {
        continue;
      }

      totalRows++;
      if (totalRows > IMPORT_LIMITS.MAX_ROWS_LIMIT) {
        throw new BadRequestException(
          `Số lượng dòng dữ liệu vượt quá giới hạn tối đa ${IMPORT_LIMITS.MAX_ROWS_LIMIT} dòng.`,
        );
      }

      const partRaw = this.getCellValue(row.getCell(1));
      const questionText = this.getCellValue(row.getCell(2));
      const optionA = this.getCellValue(row.getCell(3));
      const optionB = this.getCellValue(row.getCell(4));
      const optionC = this.getCellValue(row.getCell(5));
      const optionD = this.getCellValue(row.getCell(6));
      const correctAnswer = this.getCellValue(row.getCell(7)).toUpperCase();
      const explanation = this.getCellValue(row.getCell(8)) || undefined;
      const difficultyRaw = this.getCellValue(row.getCell(9)).toLowerCase();
      const topicCode = this.getCellValue(row.getCell(10)) || undefined;
      const skillCode = this.getCellValue(row.getCell(11)) || undefined;
      const groupId = this.getCellValue(row.getCell(12)) || undefined;
      const passageCode = this.getCellValue(row.getCell(13)) || undefined;
      const passageText = this.getCellValue(row.getCell(14)) || undefined;
      const mediaRef = this.getCellValue(row.getCell(15)) || undefined;

      const partNumber = parseInt(partRaw, 10);
      let rowHasError = false;

      // Validate Part
      if (isNaN(partNumber) || partNumber < 1 || partNumber > 7) {
        errors.push({
          row: r,
          error: 'Phần thi (Part) phải là số nguyên từ 1 đến 7.',
          code: 'INVALID_PART',
          groupId,
        });
        rowHasError = true;
      }

      const isAudioOnlyPart = partNumber === 1 || partNumber === 2;
      const isPart6InGroup = partNumber === 6 && !!groupId;

      // Validate Question_Text
      if (!questionText && !isAudioOnlyPart && !isPart6InGroup) {
        errors.push({
          row: r,
          error: 'Nội dung câu hỏi không được để trống (trừ Part 1, Part 2 hoặc Part 6 có nhóm).',
          code: 'MISSING_QUESTION_TEXT',
          groupId,
        });
        rowHasError = true;
      }

      // Validate Options A, B, C
      if (!isAudioOnlyPart && (!optionA || !optionB || !optionC)) {
        errors.push({
          row: r,
          error: 'Lựa chọn A, B và C là bắt buộc.',
          code: 'MISSING_OPTIONS',
          groupId,
        });
        rowHasError = true;
      }

      // Validate Option D
      if (partNumber === 2) {
        if (optionD) {
          errors.push({
            row: r,
            error: 'Part 2 chỉ có 3 lựa chọn (A, B, C). Không được nhập Option D.',
            code: 'PART_2_MAX_3_OPTIONS',
            groupId,
          });
          rowHasError = true;
        }
      } else if (!isAudioOnlyPart && !rowHasError && !optionD) {
        errors.push({
          row: r,
          error: `Lựa chọn D là bắt buộc đối với Part ${partNumber}.`,
          code: 'MISSING_OPTION_D',
          groupId,
        });
        rowHasError = true;
      }

      // Validate Correct_Answer
      const validAnswers = partNumber === 2 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
      if (!validAnswers.includes(correctAnswer)) {
        errors.push({
          row: r,
          error:
            partNumber === 2
              ? 'Đáp án đúng của Part 2 phải là A, B hoặc C.'
              : 'Đáp án đúng phải là A, B, C hoặc D.',
          code: 'INVALID_CORRECT_ANSWER',
          groupId,
        });
        rowHasError = true;
      }

      // Validate Difficulty
      let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
      if (difficultyRaw) {
        if (['easy', 'medium', 'hard'].includes(difficultyRaw)) {
          difficulty = difficultyRaw as 'easy' | 'medium' | 'hard';
        } else {
          errors.push({
            row: r,
            error: 'Độ khó phải là easy, medium hoặc hard.',
            code: 'INVALID_DIFFICULTY',
            groupId,
          });
          rowHasError = true;
        }
      }

      if (rowHasError) {
        continue;
      }

      const parsedRow: ParsedQuestionRow = {
        rowNumber: r,
        partNumber,
        questionText,
        optionA,
        optionB,
        optionC,
        optionD: optionD || undefined,
        correctAnswer: correctAnswer as 'A' | 'B' | 'C' | 'D',
        explanation,
        difficulty,
        topicCode,
        skillCode,
        groupId,
        passageCode,
        passageText,
        mediaRef,
      };

      if (groupId) {
        const existingGroup = groupedQuestions.get(groupId);
        if (existingGroup) {
          existingGroup.push(parsedRow);
        } else {
          groupedQuestions.set(groupId, [parsedRow]);
        }
      } else {
        standaloneQuestions.push(parsedRow);
      }
    }

    return {
      standaloneQuestions,
      groupedQuestions,
      totalRows,
      errors,
    };
  }
}
