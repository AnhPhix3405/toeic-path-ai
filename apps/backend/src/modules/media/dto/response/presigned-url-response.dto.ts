import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PresignedUrlResponseDto {
  @ApiProperty({ example: 'https://storage.example.com/upload/sign/...' })
  uploadUrl!: string;

  @ApiProperty({ example: 'questions/audio/user-uuid/550e8400-e29b-41d4-a716-446655440000.mp3' })
  storageKey!: string;

  @ApiProperty({ example: 'https://storage.example.com/public/media/questions/audio/user-uuid/550e8400...' })
  publicUrl!: string;

  @ApiProperty({ example: 900, description: 'Seconds until URL expires' })
  expiresInSeconds!: number;

  @ApiProperty({ example: 'PUT', description: 'HTTP method to use for direct upload' })
  httpMethod!: 'PUT' | 'POST';

  @ApiPropertyOptional({ description: 'Optional headers required for upload' })
  requiredHeaders?: Record<string, string>;
}

export class BatchPresignedUrlResponseDto {
  @ApiProperty({ type: [PresignedUrlResponseDto] })
  results!: PresignedUrlResponseDto[];
}
