import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Gender } from '../../../../common/enums/gender.enum';
import { UpdateMyProfileDto } from './update-my-profile.dto';

describe('UpdateMyProfileDto', () => {
  it('normalizes allowed text fields', async () => {
    const dto = plainToInstance(UpdateMyProfileDto, {
      fullName: ' Student ',
      bio: '   ',
      gender: Gender.OTHER,
      birthday: null,
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ fullName: 'Student', bio: null });
  });

  it.each([
    [{ fullName: '   ' }],
    [{ fullName: null }],
    [{ birthday: '2999-01-01' }],
    [{ birthday: '2026-02-30' }],
    [{ gender: 'invalid' }],
    [{ bio: 'x'.repeat(501) }],
  ])('rejects invalid profile input %#', async (input) => {
    const errors = await validate(plainToInstance(UpdateMyProfileDto, input));
    expect(errors.length).toBeGreaterThan(0);
  });
});
