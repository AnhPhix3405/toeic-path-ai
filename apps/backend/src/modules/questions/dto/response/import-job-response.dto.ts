import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImportJobStatus } from '../../enums/import-job-status.enum';
import { QuestionStatus } from '../../enums/question-status.enum';

export class ImportErrorDetailDto {
  @ApiProperty({ description: 'Dòng trong file Excel xảy ra lỗi', example: 5 })
  row!: number;

  @ApiProperty({
    description: 'Nội dung thông báo lỗi',
    example: 'Đáp án đúng phải là A, B, C hoặc D.',
  })
  error!: string;

  @ApiPropertyOptional({
    description: 'Mã lỗi phân loại',
    example: 'INVALID_CORRECT_ANSWER',
  })
  code?: string;
}

export class ImportSyncResponseDto {
  @ApiProperty({ description: 'ID của lượt import job', example: 'uuid' })
  jobId!: string;

  @ApiProperty({ description: 'Xử lý bất đồng bộ hay không', example: false })
  isAsync!: boolean;

  @ApiProperty({ description: 'Trạng thái xử lý', enum: ImportJobStatus })
  status!: ImportJobStatus;

  @ApiProperty({ description: 'Tổng số dòng dữ liệu trong tệp', example: 25 })
  totalRows!: number;

  @ApiProperty({ description: 'Số câu hỏi import thành công', example: 24 })
  successCount!: number;

  @ApiProperty({ description: 'Số câu hỏi bị lỗi', example: 1 })
  errorCount!: number;

  @ApiProperty({ description: 'Số nhóm câu hỏi được tạo', example: 3 })
  createdGroupsCount!: number;

  @ApiPropertyOptional({
    description: 'Chi tiết các dòng bị lỗi',
    type: [ImportErrorDetailDto],
  })
  errorDetails?: ImportErrorDetailDto[] | null;
}

export class ImportAsyncAcceptedDto {
  @ApiProperty({ description: 'ID của lượt import job', example: 'uuid' })
  jobId!: string;

  @ApiProperty({ description: 'Xử lý bất đồng bộ hay không', example: true })
  isAsync!: boolean;

  @ApiProperty({
    description: 'Trạng thái xử lý ban đầu',
    enum: ImportJobStatus,
    example: ImportJobStatus.PROCESSING,
  })
  status!: ImportJobStatus;

  @ApiProperty({ description: 'Tổng số dòng dữ liệu trong tệp', example: 150 })
  totalRows!: number;

  @ApiProperty({
    description: 'Thông báo kết quả tiếp nhận',
    example: 'Tệp lớn đã được tiếp nhận và đang được xử lý bất đồng bộ qua hàng đợi.',
  })
  message!: string;
}

export class ImportJobDetailDto {
  @ApiProperty({ description: 'ID job', example: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Tên file gốc', example: 'questions.xlsx' })
  fileName!: string;

  @ApiPropertyOptional({ description: 'Đường dẫn file lưu trữ trên cloud' })
  fileUrl!: string | null;

  @ApiProperty({ description: 'Định dạng file (excel hoặc zip)', example: 'excel' })
  fileType!: string;

  @ApiProperty({ description: 'Trạng thái xử lý', enum: ImportJobStatus })
  status!: ImportJobStatus;

  @ApiProperty({ description: 'Trạng thái đích của câu hỏi', enum: QuestionStatus })
  targetStatus!: QuestionStatus;

  @ApiProperty({ description: 'Tổng số dòng trong tệp', example: 120 })
  totalRows!: number;

  @ApiProperty({ description: 'Số câu import thành công', example: 118 })
  successCount!: number;

  @ApiProperty({ description: 'Số câu bị lỗi', example: 2 })
  errorCount!: number;

  @ApiProperty({ description: 'Số nhóm câu hỏi tạo thành công', example: 10 })
  createdGroupsCount!: number;

  @ApiPropertyOptional({
    description: 'Chi tiết lỗi các dòng',
    type: [ImportErrorDetailDto],
  })
  errorDetails!: ImportErrorDetailDto[] | null;

  @ApiProperty({ description: 'ID người tạo job' })
  createdBy!: string;

  @ApiProperty({ description: 'Thời điểm tạo job' })
  createdAt!: string;

  @ApiProperty({ description: 'Thời điểm cập nhật job' })
  updatedAt!: string;

  @ApiPropertyOptional({ description: 'Thời điểm hoàn thành job' })
  completedAt!: string | null;
}
