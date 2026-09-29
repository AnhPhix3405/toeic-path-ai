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
          return value === (args.object as ResetPasswordDto).newPassword;
        },
        defaultMessage(): string {
          return 'confirmPassword must match newPassword';
        },
      },
    });
  };
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'opaque-reset-token', description: 'Single-use, expiring token' })
  @IsString()
  @MaxLength(2048)
  @Matches(/\S/, { message: 'token must not be empty' })
  token!: string;

  @ApiProperty({ example: 'NewPassword123!' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,72}$/, {
    message:
      'newPassword must be 12-72 characters and include uppercase, lowercase, number, and special character',
  })
  newPassword!: string;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsString()
  @MatchesNewPassword()
  confirmPassword!: string;
}
