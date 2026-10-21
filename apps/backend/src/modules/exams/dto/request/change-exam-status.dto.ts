import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class ChangeExamStatusDto {
  @ApiProperty({
    example: 1,
    description: 'Phiên bản hiện tại của đề thi (Optimistic Locking Concurrency Control)',
  })
  @Type(() => Number)
  @IsInt({ message: 'version phải là số nguyên' })
  @Min(1, { message: 'version phải lớn hơn hoặc bằng 1' })
  @IsNotEmpty({ message: 'version không được để trống' })
  version!: number;
}
