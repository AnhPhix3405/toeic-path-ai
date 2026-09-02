import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Gender } from '../../common/enums/gender.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { UserProfile } from '../users/entities/user-profile.entity';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  const profile: UserProfile = {
    id: '10000000-0000-4000-8000-000000000001',
    userId: '20000000-0000-4000-8000-000000000002',
    user: {
      id: '20000000-0000-4000-8000-000000000002',
      email: 'student@example.com',
      passwordHash: 'must-not-be-returned',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
      lastLoginAt: null,
      termsAcceptedAt: null,
      termsVersion: null,
      profile: undefined as unknown as UserProfile,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    fullName: 'Student',
    avatarUrl: 'https://example.com/avatar.png',
    birthday: null,
    gender: null,
    bio: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  let repository: jest.Mocked<Pick<Repository<UserProfile>, 'findOne' | 'save'>>;
  let service: ProfileService;

  beforeEach(() => {
    repository = {
      findOne: jest.fn().mockResolvedValue(structuredClone(profile)),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    service = new ProfileService(repository as unknown as Repository<UserProfile>);
  });

  it('gets only the authenticated user profile and maps a safe response', async () => {
    const result = await service.getMyProfile(profile.userId);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { userId: profile.userId },
      relations: { user: true },
    });
    expect(result).toEqual({
      userId: profile.userId,
      email: 'student@example.com',
      role: UserRole.STUDENT,
      profile: {
        fullName: 'Student',
        avatarUrl: 'https://example.com/avatar.png',
        birthday: null,
        gender: null,
        bio: null,
      },
      updatedAt: profile.updatedAt,
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('updates only supplied fields and preserves avatarUrl', async () => {
    const result = await service.updateMyProfile(profile.userId, {
      birthday: '2003-08-15',
      gender: Gender.MALE,
      bio: 'TOEIC 850',
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Student',
        avatarUrl: profile.avatarUrl,
        birthday: '2003-08-15',
        gender: Gender.MALE,
        bio: 'TOEIC 850',
      }),
    );
    expect(result.profile.avatarUrl).toBe(profile.avatarUrl);
  });

  it('uses null to clear nullable fields', async () => {
    await service.updateMyProfile(profile.userId, {
      birthday: null,
      gender: null,
      bio: null,
    });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ birthday: null, gender: null, bio: null }),
    );
  });

  it('rejects an empty patch without writing', async () => {
    await expect(service.updateMyProfile(profile.userId, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a transformed DTO whose allowed fields are all undefined', async () => {
    await expect(
      service.updateMyProfile(profile.userId, {
        fullName: undefined,
        birthday: undefined,
        gender: undefined,
        bio: undefined,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findOne).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('reports missing invariant data and never creates a profile', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.getMyProfile(profile.userId)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('propagates database failures', async () => {
    repository.save.mockRejectedValue(new Error('database unavailable'));
    await expect(service.updateMyProfile(profile.userId, { fullName: 'Changed' })).rejects.toThrow(
      'database unavailable',
    );
  });
});
