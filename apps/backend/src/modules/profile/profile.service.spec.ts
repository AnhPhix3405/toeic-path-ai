import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import { Gender } from '../../common/enums/gender.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { UserProfile } from '../users/entities/user-profile.entity';
import { ProfileService } from './profile.service';
import type { StorageService } from '../storage/interfaces/storage-service.interface';
import type { AvatarImageService } from './services/avatar-image.service';

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
    avatarStorageKey: 'avatars/user/avatar.png',
    avatarMimeType: 'image/png',
    avatarSizeBytes: 100,
    birthday: null,
    gender: null,
    bio: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  let repository: jest.Mocked<Pick<Repository<UserProfile>, 'findOne' | 'save'>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
  let storageService: jest.Mocked<StorageService>;
  let avatarImageService: jest.Mocked<Pick<AvatarImageService, 'process'>>;
  let manager: jest.Mocked<Pick<EntityManager, 'getRepository' | 'save'>>;
  let storageUploadMock: jest.Mock;
  let storageDeleteMock: jest.Mock;
  let imageProcessMock: jest.Mock;
  let managerSaveMock: jest.Mock;
  let queryBuilder: {
    leftJoinAndSelect: jest.Mock;
    setLock: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };
  let service: ProfileService;

  beforeEach(() => {
    repository = {
      findOne: jest.fn().mockResolvedValue(structuredClone(profile)),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(structuredClone(profile)),
    };
    managerSaveMock = jest.fn().mockImplementation((value) => Promise.resolve(value));
    manager = {
      getRepository: jest.fn().mockReturnValue({ createQueryBuilder: () => queryBuilder }),
      save: managerSaveMock,
    };
    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation((callback: (value: EntityManager) => unknown) =>
          callback(manager as unknown as EntityManager),
        ),
    };
    storageUploadMock = jest.fn().mockResolvedValue({
      url: 'https://storage.example/new.webp',
      storageKey: 'avatars/user/new.webp',
      mimeType: 'image/webp',
      sizeBytes: 80,
    });
    storageDeleteMock = jest.fn().mockResolvedValue(undefined);
    storageService = {
      uploadAvatar: storageUploadMock,
      deleteFile: storageDeleteMock,
    };
    imageProcessMock = jest.fn().mockResolvedValue({
      buffer: Buffer.from('processed'),
      mimeType: 'image/webp',
      extension: 'webp',
    });
    avatarImageService = {
      process: imageProcessMock,
    };
    service = new ProfileService(
      repository as unknown as Repository<UserProfile>,
      dataSource as unknown as DataSource,
      storageService,
      avatarImageService as unknown as AvatarImageService,
    );
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

  it('uploads first, atomically replaces metadata, then cleans the old file', async () => {
    const file = { buffer: Buffer.from('input') } as Express.Multer.File;
    const result = await service.uploadMyAvatar(profile.userId, file);

    expect(imageProcessMock).toHaveBeenCalledWith(file);
    expect(storageUploadMock).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: profile.userId, mimeType: 'image/webp' }),
    );
    expect(managerSaveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        avatarUrl: 'https://storage.example/new.webp',
        avatarStorageKey: 'avatars/user/new.webp',
      }),
    );
    expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write', undefined, ['profile']);
    expect(storageDeleteMock).toHaveBeenCalledWith(profile.avatarStorageKey);
    expect(result.profile.avatarUrl).toBe('https://storage.example/new.webp');
  });

  it('cleans the newly uploaded file when the database transaction fails', async () => {
    dataSource.transaction.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(
      service.uploadMyAvatar(profile.userId, {
        buffer: Buffer.from('input'),
      } as Express.Multer.File),
    ).rejects.toThrow('database unavailable');
    expect(storageDeleteMock).toHaveBeenCalledWith('avatars/user/new.webp');
  });

  it('does not write or delete the old avatar when storage upload fails', async () => {
    storageUploadMock.mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(
      service.uploadMyAvatar(profile.userId, {
        buffer: Buffer.from('input'),
      } as Express.Multer.File),
    ).rejects.toThrow('storage unavailable');
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(storageDeleteMock).not.toHaveBeenCalled();
  });

  it('deletes avatar metadata idempotently without a storage call when already null', async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        ...structuredClone(profile),
        avatarUrl: null,
        avatarStorageKey: null,
        avatarMimeType: null,
        avatarSizeBytes: null,
      }),
    };
    manager.getRepository.mockReturnValue({
      createQueryBuilder: () => queryBuilder,
    } as never);

    const result = await service.deleteMyAvatar(profile.userId);
    expect(result.profile.avatarUrl).toBeNull();
    expect(storageDeleteMock).not.toHaveBeenCalled();
  });
});
