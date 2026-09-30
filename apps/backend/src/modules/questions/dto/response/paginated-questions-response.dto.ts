import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../../../common/dto/response/paginated-response.dto';
import { QuestionResponseDto } from './question-response.dto';

export class PaginatedQuestionsResponseDto extends PaginatedResponseDto<QuestionResponseDto> {
  @ApiProperty({ type: () => QuestionResponseDto, isArray: true })
  declare data: QuestionResponseDto[];
}
