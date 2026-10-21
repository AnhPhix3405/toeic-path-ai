import { ApiProperty } from '@nestjs/swagger';
import { ExamStatus } from '../../enums/exam-status.enum';

export class ExamPublishResultResponseDto {
  @ApiProperty({
    example: 'd9b7367e-28ec-40f4-8395-8b89e3ec01bc',
    description: 'ID định danh đề thi',
  })
  id!: string;

  @ApiProperty({ example: 'ETS TOEIC 2026 Test 01', description: 'Tiêu đề đề thi' })
  title!: string;

  @ApiProperty({
    enum: ExamStatus,
    example: ExamStatus.PUBLISHED,
    description: 'Trạng thái đề thi trong cơ sở dữ liệu (draft, published, closed, archived)',
  })
  status!: ExamStatus;

  @ApiProperty({ example: 2, description: 'Phiên bản mới nhất của đề thi sau cập nhật' })
  version!: number;

  @ApiProperty({
    example: false,
    description:
      'Trạng thái suy diễn (Computed Status): true nếu status là published và openAt nằm trong tương lai',
  })
  isScheduled!: boolean;

  @ApiProperty({
    example: '2026-11-01T08:00:00.000Z',
    nullable: true,
    description: 'Thời điểm bắt đầu mở đề thi',
  })
  openAt!: Date | null;

  @ApiProperty({
    example: '2026-11-30T17:00:00.000Z',
    nullable: true,
    description: 'Thời điểm kết thúc đề thi',
  })
  closeAt!: Date | null;

  @ApiProperty({
    example: '2026-10-21T10:00:00.000Z',
    nullable: true,
    description: 'Thời điểm xuất bản đề thi',
  })
  publishedAt!: Date | null;

  @ApiProperty({
    example: '2026-10-21T10:00:00.000Z',
    description: 'Thời điểm cập nhật bản ghi',
  })
  updatedAt!: Date;
}
