import { ApiProperty } from '@nestjs/swagger';
import { ExamCatalogItemResponseDto } from './exam-catalog-item-response.dto';

export class PublicLandingStatsDto {
  @ApiProperty({ description: 'Tổng số đề thi đang xuất bản', example: 12 })
  publishedExamsCount!: number;

  @ApiProperty({ description: 'Tổng số câu hỏi TOEIC đã kiểm duyệt xuất bản', example: 1400 })
  publishedQuestionsCount!: number;

  @ApiProperty({ description: 'Tổng số lượt hoàn thành bài thi', example: 350 })
  completedAttemptsCount!: number;

  @ApiProperty({ description: 'Số phần thi TOEIC chuẩn ETS hỗ trợ (Part 1–7)', example: 7 })
  supportedToeicPartsCount!: number;
}

export class PublicLandingSummaryResponseDto {
  @ApiProperty({ type: PublicLandingStatsDto })
  stats!: PublicLandingStatsDto;

  @ApiProperty({ type: [ExamCatalogItemResponseDto] })
  featuredExams!: ExamCatalogItemResponseDto[];
}
