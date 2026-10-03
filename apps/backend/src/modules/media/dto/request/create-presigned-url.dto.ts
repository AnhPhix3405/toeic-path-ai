import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { MediaResourceType } from '../../../questions/enums/media-resource-type.enum';

export class CreatePresignedUrlDto {
  @ApiProperty({ example: 'conversation_part3_audio.mp3' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ enum: MediaResourceType, example: MediaResourceType.AUDIO })
  @IsEnum(MediaResourceType)
  resourceType!: MediaResourceType;

  @ApiProperty({ example: 'audio/mpeg' })
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiProperty({ example: 1048576, description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  fileSize!: number;
}
