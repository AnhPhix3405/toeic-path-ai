import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserStatus } from '../../../common/enums/user-status.enum';

export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus, example: UserStatus.LOCKED })
  @IsEnum(UserStatus)
  status!: UserStatus;
}
