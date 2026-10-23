import { ApiProperty } from '@nestjs/swagger';
import { ExamCatalogItemResponseDto } from './exam-catalog-item-response.dto';

export class PaginatedExamsCatalogResponseDto {
  @ApiProperty({ type: [ExamCatalogItemResponseDto] })
  items!: ExamCatalogItemResponseDto[];

  @ApiProperty({ description: 'Tổng số đề thi thỏa mãn điều kiện', example: 12 })
  total!: number;

  @ApiProperty({ description: 'Trang hiện tại', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Số lượng đề thi mỗi trang', example: 10 })
  limit!: number;

  @ApiProperty({ description: 'Tổng số trang', example: 2 })
  totalPages!: number;
}
