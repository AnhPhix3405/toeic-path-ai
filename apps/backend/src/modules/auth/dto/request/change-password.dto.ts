import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  Matches,
  MaxLength,
  registerDecorator,
  type ValidationArguments,
} from 'class-validator';

function MatchesNewPassword() {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'matchesNewPassword',
      target: object.constructor,
      propertyName,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          return value === (args.object as ChangePasswordDto).newPassword;
        },
        defaultMessage(): string {
          return 'confirmNewPassword must match newPassword';
        },
      },
    });
  };
}

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPassword123!',
    description: 'Current account password for verification',
  })
  @IsString()
  @MaxLength(72)
  @Matches(/\S/, { message: 'currentPassword must not be empty' })
  currentPassword!: string;

  @ApiProperty({
    example: 'NewSecurePassword456!@',
    description:
      'New password meeting complexity criteria (12-72 chars, upper, lower, digit, special)',
  })
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,72}$/, {
    message:
      'newPassword must be 12-72 characters and include uppercase, lowercase, number, and special character',
  })
  newPassword!: string;

  @ApiProperty({
    example: 'NewSecurePassword456!@',
    description: 'Confirmation of the new password',
  })
  @IsString()
  @MatchesNewPassword()
  confirmNewPassword!: string;
}
