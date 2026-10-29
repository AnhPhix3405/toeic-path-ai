import { ApiProperty } from '@nestjs/swagger';

export class AbandonAttemptResponseDto {
  @ApiProperty({ example: true })
  success: boolean = true;

  @ApiProperty({ example: 'Đã hủy bài thi thành công' })
  message: string = 'Đã hủy bài thi thành công';

  @ApiProperty({ example: '2026-11-01T09:30:00.000Z' })
  abandonedAt!: Date;
}
