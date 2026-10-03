import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaResourceType } from '../../../questions/enums/media-resource-type.enum';

export class MediaResourceResponseDto {
  @ApiProperty({ example: '30000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: 'audio_part3.mp3' })
  fileName!: string;

  @ApiProperty({ example: 'https://storage.example.com/public/media/audio_part3.mp3' })
  fileUrl!: string;

  @ApiProperty({ enum: MediaResourceType, example: MediaResourceType.AUDIO })
  resourceType!: MediaResourceType;

  @ApiProperty({ example: 'audio/mpeg' })
  mimeType!: string;

  @ApiProperty({ example: 1048576 })
  fileSize!: number;

  @ApiPropertyOptional({ example: '10000000-0000-4000-8000-000000000001', nullable: true })
  questionId!: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  questionGroupId!: string | null;

  @ApiProperty({ example: '40000000-0000-4000-8000-000000000001' })
  createdBy!: string;

  @ApiProperty({ example: '2026-10-02T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-10-02T10:00:00.000Z' })
  updatedAt!: string;
}
