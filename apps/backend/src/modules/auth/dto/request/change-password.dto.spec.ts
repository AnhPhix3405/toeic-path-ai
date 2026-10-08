import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChangePasswordDto } from './change-password.dto';

describe('ChangePasswordDto', () => {
  const valid = {
    currentPassword: 'CurrentPassword123!',
    newPassword: 'NewSecurePassword456!@',
    confirmNewPassword: 'NewSecurePassword456!@',
  };

  it('accepts valid change password payload', async () => {
    const dto = plainToInstance(ChangePasswordDto, valid);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects when confirmNewPassword does not match newPassword', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      ...valid,
      confirmNewPassword: 'MismatchedPassword999!',
    });
    const errors = await validate(dto);
    expect(errors.some((err) => err.property === 'confirmNewPassword')).toBe(true);
  });

  it.each([
    ['short1!A', 'length under 12'],
    ['nouppercase123!@#', 'missing uppercase'],
    ['NOLOWERCASE123!@#', 'missing lowercase'],
    ['NoDigitsHere!@#$', 'missing digits'],
    ['NoSpecialChars1234', 'missing special characters'],
  ])('rejects weak newPassword: %s (%s)', async (weakPassword) => {
    const dto = plainToInstance(ChangePasswordDto, {
      ...valid,
      newPassword: weakPassword,
      confirmNewPassword: weakPassword,
    });
    const errors = await validate(dto);
    expect(errors.some((err) => err.property === 'newPassword')).toBe(true);
  });

  it.each([
    ['', 'empty string'],
    ['   ', 'whitespace only'],
  ])('rejects empty or whitespace currentPassword: %s (%s)', async (emptyCurrent) => {
    const dto = plainToInstance(ChangePasswordDto, {
      ...valid,
      currentPassword: emptyCurrent,
    });
    const errors = await validate(dto);
    expect(errors.some((err) => err.property === 'currentPassword')).toBe(true);
  });
});
