import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { UserStatus } from '../../../../common/enums/user-status.enum';

export class RegisterProfileResponseDto {
  @ApiProperty({ example: 'Nguyen Van A' })
  fullName!: string;

  @ApiProperty({ example: null, nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ example: null, nullable: true })
  bio!: string | null;
}

export class RegisterResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'student@example.com' })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.STUDENT })
  role!: UserRole;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status!: UserStatus;

  @ApiProperty({ type: RegisterProfileResponseDto })
  profile!: RegisterProfileResponseDto;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}
