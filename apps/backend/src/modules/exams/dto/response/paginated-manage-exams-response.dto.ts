import { ApiProperty } from '@nestjs/swagger';
import { ExamDetailResponseDto } from './exam-detail-response.dto';

export class PaginatedManageExamsResponseDto {
  @ApiProperty({ type: [ExamDetailResponseDto] })
  items!: ExamDetailResponseDto[];

  @ApiProperty({ description: 'Tổng số đề thi quản trị thỏa mãn điều kiện', example: 25 })
  total!: number;

  @ApiProperty({ description: 'Trang hiện tại', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Số lượng đề thi mỗi trang', example: 10 })
  limit!: number;

  @ApiProperty({ description: 'Tổng số trang', example: 3 })
  totalPages!: number;
}
