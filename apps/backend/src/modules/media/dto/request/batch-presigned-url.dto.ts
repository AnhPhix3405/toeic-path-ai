import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreatePresignedUrlDto } from './create-presigned-url.dto';

export class BatchPresignedUrlDto {
  @ApiProperty({
    type: [CreatePresignedUrlDto],
    description: 'List of files to get presigned upload URLs (1-10 items)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreatePresignedUrlDto)
  files!: CreatePresignedUrlDto[];
}
