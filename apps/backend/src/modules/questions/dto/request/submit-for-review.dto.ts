import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class SubmitForReviewDto {
  @ApiProperty({
    description: 'Danh sách ID các câu hỏi cần gửi duyệt',
    example: ['d290f1ee-6c54-4b01-90e6-d701748f0851'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  questionIds!: string[];
}
