import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  const valid = {
    fullName: ' Nguyen Van A ',
    email: ' Student@Example.com ',
    password: 'StrongPassword123!',
    confirmPassword: 'StrongPassword123!',
    acceptTerms: true,
  };

  it('trims fullName and normalizes email', async () => {
    const dto = plainToInstance(RegisterDto, valid);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.fullName).toBe('Nguyen Van A');
    expect(dto.email).toBe('student@example.com');
  });

  it.each([
    [{ ...valid, acceptTerms: false }, 'acceptTerms'],
    [{ ...valid, confirmPassword: 'DifferentPassword123!' }, 'confirmPassword'],
  ])('rejects invalid registration constraints', async (input, property) => {
    const errors = await validate(plainToInstance(RegisterDto, input));
    expect(errors.some((error) => error.property === property)).toBe(true);
  });
});
