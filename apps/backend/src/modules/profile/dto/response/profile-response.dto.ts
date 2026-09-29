import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { Gender } from '../../../../common/enums/gender.enum';

export class PersonalProfileDto {
  @ApiProperty({ example: 'Nguyen Van A' })
  fullName!: string;

  @ApiPropertyOptional({ nullable: true, example: null })
  avatarUrl!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2003-08-15' })
  birthday!: string | null;

  @ApiPropertyOptional({ enum: Gender, nullable: true, example: Gender.MALE })
  gender!: Gender | null;

  @ApiPropertyOptional({ nullable: true, example: 'TOEIC goal: 800+' })
  bio!: string | null;
}

export class ProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'student@example.com' })
  email!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty({ type: PersonalProfileDto })
  profile!: PersonalProfileDto;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
