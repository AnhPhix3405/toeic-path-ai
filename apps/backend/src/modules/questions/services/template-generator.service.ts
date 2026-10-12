import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface GeneratedTemplateResult {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

@Injectable()
export class TemplateGeneratorService {
  async generateQuestionsTemplate(): Promise<GeneratedTemplateResult> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TOEIC Path AI';
    workbook.lastModifiedBy = 'TOEIC Path AI';
    workbook.created = new Date();
    workbook.modified = new Date();

    // 1. Sheet: Questions_Template
    const dataSheet = workbook.addWorksheet('Questions_Template', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const headers = [
      { header: 'Part', key: 'part', width: 10 },
      { header: 'Question_Text', key: 'question_text', width: 45 },
      { header: 'Option_A', key: 'option_a', width: 25 },
      { header: 'Option_B', key: 'option_b', width: 25 },
      { header: 'Option_C', key: 'option_c', width: 25 },
      { header: 'Option_D', key: 'option_d', width: 25 },
      { header: 'Correct_Answer', key: 'correct_answer', width: 16 },
      { header: 'Explanation', key: 'explanation', width: 35 },
      { header: 'Difficulty', key: 'difficulty', width: 15 },
      { header: 'Topic_Code', key: 'topic_code', width: 18 },
      { header: 'Skill_Code', key: 'skill_code', width: 18 },
      { header: 'Group_ID', key: 'group_id', width: 18 },
      { header: 'Passage_Code', key: 'passage_code', width: 18 },
      { header: 'Passage_Text', key: 'passage_text', width: 40 },
      { header: 'Media_Ref', key: 'media_ref', width: 30 },
    ];

    dataSheet.columns = headers;

    // Header styling: Background #1E40AF, White bold text
    const headerRow = dataSheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' },
      };
      cell.font = {
        name: 'Segoe UI',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11,
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    });

    // Data validations for rows 2 to 1000
    for (let r = 2; r <= 1000; r++) {
      // Part validation: 1, 2, 3, 4, 5, 6, 7
      dataSheet.getCell(`A${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"1,2,3,4,5,6,7"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Part',
        error: 'Part must be between 1 and 7.',
      };

      // Correct_Answer validation: A, B, C, D
      dataSheet.getCell(`G${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"A,B,C,D"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Answer',
        error: 'Correct answer must be A, B, C, or D.',
      };

      // Difficulty validation: easy, medium, hard
      dataSheet.getCell(`I${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"easy,medium,hard"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Difficulty',
        error: 'Difficulty must be easy, medium, or hard.',
      };
    }

    // Sample data
    dataSheet.addRow({
      part: 5,
      question_text: 'The seminar on digital marketing will begin ___ 9:00 AM tomorrow.',
      option_a: 'at',
      option_b: 'on',
      option_c: 'in',
      option_d: 'to',
      correct_answer: 'A',
      explanation: 'Use preposition "at" before clock times.',
      difficulty: 'easy',
      topic_code: 'GRAMMAR',
      skill_code: 'READING',
      group_id: '',
      passage_code: '',
      passage_text: '',
      media_ref: '',
    });

    dataSheet.addRow({
      part: 3,
      question_text: 'Where does the conversation most likely take place?',
      option_a: 'At a bank',
      option_b: 'In a restaurant',
      option_c: 'At an airport',
      option_d: 'In a library',
      correct_answer: 'C',
      explanation: 'The speakers mention boarding passes and flight gates.',
      difficulty: 'medium',
      topic_code: 'TRAVEL',
      skill_code: 'LISTENING',
      group_id: 'GRP_SAMPLE_01',
      passage_code: '',
      passage_text: 'Questions 32-34 refer to the following conversation...',
      media_ref: 'audio/conversation_32_34.mp3',
    });

    dataSheet.addRow({
      part: 3,
      question_text: 'What problem does the woman mention?',
      option_a: 'Her flight is delayed',
      option_b: 'She lost her passport',
      option_c: 'Her seat is broken',
      option_d: 'The meal is cold',
      correct_answer: 'A',
      explanation: 'She says "The departure screen shows a two-hour delay".',
      difficulty: 'medium',
      topic_code: 'TRAVEL',
      skill_code: 'LISTENING',
      group_id: 'GRP_SAMPLE_01',
      passage_code: '',
      passage_text: '',
      media_ref: '',
    });

    // 2. Sheet: Instructions_Guide
    const guideSheet = workbook.addWorksheet('Instructions_Guide');
    guideSheet.columns = [
      { header: 'Cột (Column)', key: 'column', width: 20 },
      { header: 'Bắt buộc?', key: 'required', width: 14 },
      { header: 'Kiểu dữ liệu & Giá trị hợp lệ', key: 'type', width: 35 },
      { header: 'Mô tả chi tiết', key: 'desc', width: 55 },
    ];

    const guideHeaderRow = guideSheet.getRow(1);
    guideHeaderRow.height = 26;
    guideHeaderRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      cell.font = {
        name: 'Segoe UI',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11,
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const guideRows = [
      {
        column: 'Part',
        required: 'Bắt buộc',
        type: 'Số nguyên (1 - 7)',
        desc: 'Phần thi TOEIC (Part 1, 2, 3, 4: Nghe; Part 5, 6, 7: Đọc).',
      },
      {
        column: 'Question_Text',
        required: 'Bắt buộc',
        type: 'Chuỗi ký tự',
        desc: 'Nội dung câu hỏi. Đối với Part 1 và Part 2, nếu không có câu hỏi chữ thì ghi câu hỏi dẫn hoặc để placeholder phù hợp.',
      },
      {
        column: 'Option_A',
        required: 'Bắt buộc',
        type: 'Chuỗi ký tự',
        desc: 'Lựa chọn đáp án A.',
      },
      {
        column: 'Option_B',
        required: 'Bắt buộc',
        type: 'Chuỗi ký tự',
        desc: 'Lựa chọn đáp án B.',
      },
      {
        column: 'Option_C',
        required: 'Bắt buộc',
        type: 'Chuỗi ký tự',
        desc: 'Lựa chọn đáp án C.',
      },
      {
        column: 'Option_D',
        required: 'Tùy chọn (Part 2 không cần)',
        type: 'Chuỗi ký tự',
        desc: 'Lựa chọn đáp án D (Bắt buộc với Part 1, 3, 4, 5, 6, 7; Part 2 chỉ có 3 lựa chọn A, B, C).',
      },
      {
        column: 'Correct_Answer',
        required: 'Bắt buộc',
        type: 'A, B, C, D',
        desc: 'Đáp án chính xác (chữ in hoa).',
      },
      {
        column: 'Explanation',
        required: 'Tùy chọn',
        type: 'Chuỗi ký tự',
        desc: 'Lời giải thích chi tiết cho câu hỏi.',
      },
      {
        column: 'Difficulty',
        required: 'Tùy chọn',
        type: 'easy, medium, hard',
        desc: 'Mức độ khó của câu hỏi. Mặc định là medium nếu bỏ trống.',
      },
      {
        column: 'Topic_Code',
        required: 'Tùy chọn',
        type: 'Mã Topic (vd: GRAMMAR, TRAVEL)',
        desc: 'Mã chủ đề để gắn tag cho câu hỏi.',
      },
      {
        column: 'Skill_Code',
        required: 'Tùy chọn',
        type: 'Mã Skill (vd: LISTENING, READING)',
        desc: 'Mã kỹ năng kiểm tra.',
      },
      {
        column: 'Group_ID',
        required: 'Tùy chọn (Bắt buộc cho nhóm)',
        type: 'Mã nhóm tự đặt (vd: GRP_01)',
        desc: 'Định danh nhóm câu hỏi. Các dòng có cùng Group_ID sẽ thuộc cùng 1 QuestionGroup (Part 3, 4, 6, 7). Nếu 1 câu trong nhóm lỗi, toàn bộ nhóm bị rollback (Group Atomicity).',
      },
      {
        column: 'Passage_Code',
        required: 'Tùy chọn',
        type: 'Chuỗi ký tự',
        desc: 'Mã đoạn văn bản đã tồn tại trong hệ thống (nếu dùng lại).',
      },
      {
        column: 'Passage_Text',
        required: 'Tùy chọn',
        type: 'Chuỗi ký tự',
        desc: 'Nội dung đoạn văn/hội thoại của nhóm câu hỏi.',
      },
      {
        column: 'Media_Ref',
        required: 'Tùy chọn',
        type: 'Đường dẫn tệp trong gói ZIP (vd: audio/p3_01.mp3)',
        desc: 'Đường dẫn tương đối đến file media trong gói ZIP. Chỉ được thay thế media cho câu hỏi ở trạng thái draft hoặc revision_requested.',
      },
    ];

    guideRows.forEach((row) => guideSheet.addRow(row));

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    return {
      buffer,
      fileName: 'toeic_questions_template.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}
