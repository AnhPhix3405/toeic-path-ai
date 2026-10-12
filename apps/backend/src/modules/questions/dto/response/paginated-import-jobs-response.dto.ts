import { ApiProperty } from '@nestjs/swagger';
import { ImportJobDetailDto } from './import-job-response.dto';

export class PaginatedImportJobsResponseDto {
  @ApiProperty({ type: [ImportJobDetailDto] })
  items!: ImportJobDetailDto[];

  @ApiProperty({ description: 'Tổng số job thỏa mãn điều kiện', example: 45 })
  total!: number;

  @ApiProperty({ description: 'Trang hiện tại', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Số lượng phần tử mỗi trang', example: 20 })
  limit!: number;

  @ApiProperty({ description: 'Tổng số trang', example: 3 })
  totalPages!: number;
}
