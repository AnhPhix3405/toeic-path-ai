import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

function MatchesProperty(property: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'matchesProperty',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          return value === (args.object as Record<string, unknown>)[args.constraints[0] as string];
        },
      },
    });
  };
}

export class RegisterDto {
  @ApiProperty({ example: 'Nguyen Van A', minLength: 1, maxLength: 150 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 150)
  fullName!: string;

  @ApiProperty({ example: 'student@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,72}$/, {
    message:
      'password must be 12-72 characters and include uppercase, lowercase, number, and special character',
  })
  password!: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @MatchesProperty('password', { message: 'confirmPassword must match password' })
  confirmPassword!: string;

  @ApiProperty({ example: true, description: 'Must be true to accept the current terms' })
  @Equals(true, { message: 'acceptTerms must be true' })
  acceptTerms!: boolean;
}
