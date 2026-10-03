import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsUrl, MaxLength } from 'class-validator';
import { MediaResourceType } from '../../../questions/enums/media-resource-type.enum';

export class ConfirmMediaUploadDto {
  @ApiProperty({ example: 'conversation_part3_audio.mp3' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'https://storage.example.com/public/media/questions/audio/user/file.mp3' })
  @IsUrl()
  @IsNotEmpty()
  fileUrl!: string;

  @ApiProperty({ example: 'questions/audio/user-uuid/file-uuid.mp3' })
  @IsString()
  @IsNotEmpty()
  storageKey!: string;

  @ApiProperty({ enum: MediaResourceType, example: MediaResourceType.AUDIO })
  @IsEnum(MediaResourceType)
  resourceType!: MediaResourceType;

  @ApiPropertyOptional({ example: '10000000-0000-4000-8000-000000000001', nullable: true })
  @IsOptional()
  @IsUUID('4')
  questionId?: string | null;

  @ApiPropertyOptional({ example: '20000000-0000-4000-8000-000000000001', nullable: true })
  @IsOptional()
  @IsUUID('4')
  questionGroupId?: string | null;
}
