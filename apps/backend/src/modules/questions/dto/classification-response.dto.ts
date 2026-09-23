import { ApiProperty } from '@nestjs/swagger';

export class ToeicPartResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ minimum: 1, maximum: 7, example: 5 })
  partNumber!: number;

  @ApiProperty({ example: 'Incomplete Sentences' })
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;
}

export class TaxonomyItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Business' })
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;
}
