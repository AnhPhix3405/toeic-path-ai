import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTooManyRequestsResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiAuthDoc } from '../../../common/decorators/swagger';
import { ConfigureExamSectionsDto } from '../dto/request/configure-exam-sections.dto';
import { AddExamQuestionsDto } from '../dto/request/add-exam-questions.dto';
import { ReorderExamQuestionsDto } from '../dto/request/reorder-exam-questions.dto';
import { AutoGenerateExamDto } from '../dto/request/auto-generate-exam.dto';
import { ExamStructureResponseDto } from '../dto/response/exam-structure-response.dto';

export function ApiExamsStructureControllerDoc() {
  return applyDecorators(
    ApiAuthDoc({
      unauthorizedDescription: 'Access token is invalid or absent',
      forbiddenDescription: 'Authenticated user has an unsupported role or does not own the exam',
    }),
    ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' }),
  );
}

export function ApiConfigureSectionsDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Thiết lập danh sách các Part và chỉ tiêu cho Mini Test / Placement Test (UC17)',
      description:
        'Chỉ khả dụng ở trạng thái Draft. Cấm gọi trên Full Test (7 Part cố định). placement_test yêu cầu 20-100 câu và đủ 2 kỹ năng Listening & Reading.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'UUID của đề thi' }),
    ApiBody({ type: ConfigureExamSectionsDto }),
    ApiCreatedResponse({ type: ExamStructureResponseDto }),
    ApiBadRequestResponse({
      description:
        'Cấu trúc đề không hợp lệ hoặc gọi trên Full Test (ERR_FULL_TEST_SECTIONS_IMMUTABLE)',
    }),
    ApiConflictResponse({ description: 'Xung đột phiên làm việc (ERR_CONCURRENCY_CONFLICT)' }),
    ApiNotFoundResponse({ description: 'Không tìm thấy đề thi' }),
  );
}

export function ApiGetStructureDoc() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Tra cứu cấu trúc chi tiết đề thi gồm các sections và danh sách câu hỏi theo thứ tự (UC17)',
      description: 'Dành cho Teacher (người tạo) hoặc Admin, hoặc bất kỳ ai nếu đề đã published.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'UUID của đề thi' }),
    ApiOkResponse({ type: ExamStructureResponseDto }),
    ApiNotFoundResponse({ description: 'Không tìm thấy đề thi' }),
  );
}

export function ApiAddQuestionsDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Tuyển chọn thêm câu hỏi đơn lẻ hoặc nhóm câu hỏi vào một Section (UC17)',
      description:
        'Chỉ câu hỏi published mới được thêm. Cấm thêm câu lẻ thuộc nhóm vào questionIds. Chặn câu hỏi trùng lặp trong đề.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'UUID của đề thi' }),
    ApiBody({ type: AddExamQuestionsDto }),
    ApiCreatedResponse({ type: ExamStructureResponseDto }),
    ApiBadRequestResponse({
      description:
        'Section không thuộc đề (ERR_SECTION_NOT_FOUND) hoặc vi phạm nhóm (ERR_INVALID_GROUP_INTEGRITY)',
    }),
    ApiConflictResponse({
      description:
        'Câu hỏi đã tồn tại trong đề (ERR_DUPLICATE_EXAM_QUESTION) hoặc xung đột version (ERR_CONCURRENCY_CONFLICT)',
    }),
    ApiNotFoundResponse({ description: 'Không tìm thấy đề thi' }),
  );
}

export function ApiReorderQuestionsDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Sắp xếp lại thứ tự order_index các câu hỏi trong đề thi (UC17)',
      description:
        'Cập nhật hoán vị thứ tự 1..N. Tận dụng DEFERRABLE INITIALLY DEFERRED. Bắt buộc bảo toàn thứ tự nội bộ và tính liên tiếp của nhóm câu hỏi.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'UUID của đề thi' }),
    ApiBody({ type: ReorderExamQuestionsDto }),
    ApiOkResponse({ type: ExamStructureResponseDto }),
    ApiBadRequestResponse({
      description: 'Xé lẻ nhóm câu hỏi hoặc sai thứ tự group_order (ERR_INVALID_GROUP_INTEGRITY)',
    }),
    ApiConflictResponse({ description: 'Xung đột phiên làm việc (ERR_CONCURRENCY_CONFLICT)' }),
    ApiNotFoundResponse({ description: 'Không tìm thấy đề thi' }),
  );
}

export function ApiRemoveQuestionDoc() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Gỡ bỏ câu hỏi đơn hoặc nguyên khối nhóm câu hỏi khỏi đề thi và dồn lại thứ tự (UC17)',
      description:
        'Xóa câu hỏi và tự động dồn lại thứ tự liên tục 1..N. Nếu câu hỏi thuộc nhóm, tự động xóa toàn bộ các câu hỏi con cùng nhóm.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'UUID của đề thi' }),
    ApiParam({ name: 'questionId', format: 'uuid', description: 'UUID của câu hỏi cần gỡ' }),
    ApiQuery({
      name: 'version',
      type: Number,
      required: true,
      description: 'Version hiện tại của đề thi để kiểm tra Optimistic Locking',
    }),
    ApiOkResponse({ type: ExamStructureResponseDto }),
    ApiConflictResponse({ description: 'Xung đột phiên làm việc (ERR_CONCURRENCY_CONFLICT)' }),
    ApiNotFoundResponse({ description: 'Không tìm thấy câu hỏi hoặc đề thi' }),
  );
}

export function ApiAutoGenerateDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Sinh đề tự động A4 từ ngân hàng câu hỏi theo ma trận độ khó/chủ đề (UC17)',
      description:
        'Bốc ngẫu nhiên câu hỏi published thỏa mãn tiêu chí và chỉ tiêu từng Part. Thuật toán Knapsack tránh overshoot cho Part nhóm. Rollback nếu thiếu câu hỏi.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'UUID của đề thi' }),
    ApiBody({ type: AutoGenerateExamDto }),
    ApiCreatedResponse({ type: ExamStructureResponseDto }),
    ApiConflictResponse({ description: 'Xung đột phiên làm việc (ERR_CONCURRENCY_CONFLICT)' }),
    ApiUnprocessableEntityResponse({
      description:
        'Ngân hàng câu hỏi không đủ số lượng câu hỏi/nhóm câu hỏi (ERR_QUESTION_BANK_INSUFFICIENT)',
    }),
    ApiNotFoundResponse({ description: 'Không tìm thấy đề thi' }),
  );
}
