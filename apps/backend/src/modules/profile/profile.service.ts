import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { UserProfile } from '../users/entities/user-profile.entity';
import type { UpdateMyProfileDto } from './dto/request/update-my-profile.dto';
import { ProfileResponseDto } from './dto/response/profile-response.dto';
import { STORAGE_SERVICE } from '../storage/storage.constants';
import type { StorageService, StoredFile } from '../storage/interfaces/storage-service.interface';
import { AvatarImageService } from './services/avatar-image.service';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    private readonly dataSource: DataSource,
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService,
    private readonly avatarImageService: AvatarImageService,
  ) {}

  async getMyProfile(userId: string): Promise<ProfileResponseDto> {
    const profile = await this.findByUserId(userId);
    return this.toResponse(profile);
  }

  async uploadMyAvatar(
    userId: string,
    file: Express.Multer.File | undefined,
  ): Promise<ProfileResponseDto> {
    await this.findByUserId(userId);
    const processed = await this.avatarImageService.process(file);
    const uploaded = await this.storageService.uploadAvatar({ ownerId: userId, ...processed });

    let result: { profile: UserProfile; oldStorageKey: string | null };
    try {
      result = await this.dataSource.transaction((manager) =>
        this.replaceAvatarInDatabase(manager, userId, uploaded),
      );
    } catch (error: unknown) {
      await this.tryDeleteFile(uploaded.storageKey, userId);
      throw error;
    }
    if (result.oldStorageKey) await this.tryDeleteFile(result.oldStorageKey, userId);
    this.logger.log({ event: 'AVATAR_UPLOAD_SUCCEEDED', userId, storageKey: uploaded.storageKey });
    return this.toResponse(result.profile);
  }

  async deleteMyAvatar(userId: string): Promise<ProfileResponseDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const profile = await this.findLockedProfile(manager, userId);
      const oldStorageKey = profile.avatarStorageKey;
      profile.avatarUrl = null;
      profile.avatarStorageKey = null;
      profile.avatarMimeType = null;
      profile.avatarSizeBytes = null;
      return { profile: await manager.save(profile), oldStorageKey };
    });
    if (result.oldStorageKey) await this.tryDeleteFile(result.oldStorageKey, userId);
    this.logger.log({ event: 'AVATAR_DELETED', userId });
    return this.toResponse(result.profile);
  }

  private async replaceAvatarInDatabase(
    manager: EntityManager,
    userId: string,
    uploaded: StoredFile,
  ): Promise<{ profile: UserProfile; oldStorageKey: string | null }> {
    const profile = await this.findLockedProfile(manager, userId);
    const oldStorageKey = profile.avatarStorageKey;
    profile.avatarUrl = uploaded.url;
    profile.avatarStorageKey = uploaded.storageKey;
    profile.avatarMimeType = uploaded.mimeType;
    profile.avatarSizeBytes = uploaded.sizeBytes;
    return { profile: await manager.save(profile), oldStorageKey };
  }

  private async findLockedProfile(manager: EntityManager, userId: string): Promise<UserProfile> {
    const profile = await manager
      .getRepository(UserProfile)
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .setLock('pessimistic_write', undefined, ['profile'])
      .where('profile.user_id = :userId', { userId })
      .getOne();
    if (!profile) {
      this.logger.error({ event: 'profile_invariant_violation', userId });
      throw new InternalServerErrorException('Profile data is unavailable');
    }
    return profile;
  }

  private async tryDeleteFile(storageKey: string, userId: string): Promise<void> {
    try {
      await this.storageService.deleteFile(storageKey);
    } catch {
      this.logger.error({ event: 'AVATAR_CLEANUP_FAILED', userId, storageKey });
    }
  }

  async updateMyProfile(userId: string, dto: UpdateMyProfileDto): Promise<ProfileResponseDto> {
    const hasAllowedChange =
      dto.fullName !== undefined ||
      dto.birthday !== undefined ||
      dto.gender !== undefined ||
      dto.bio !== undefined;

    if (!hasAllowedChange) {
      throw new BadRequestException('At least one profile field is required');
    }

    const profile = await this.findByUserId(userId);

    if (dto.fullName !== undefined) profile.fullName = dto.fullName;
    if (dto.birthday !== undefined) profile.birthday = dto.birthday;
    if (dto.gender !== undefined) profile.gender = dto.gender;
    if (dto.bio !== undefined) profile.bio = dto.bio;

    const updatedProfile = await this.profileRepository.save(profile);
    return this.toResponse(updatedProfile);
  }

  private async findByUserId(userId: string): Promise<UserProfile> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: { user: true },
    });

    if (!profile) {
      this.logger.error({ event: 'profile_invariant_violation', userId });
      throw new InternalServerErrorException('Profile data is unavailable');
    }

    return profile;
  }

  private toResponse(profile: UserProfile): ProfileResponseDto {
    return {
      userId: profile.userId,
      email: profile.user.email,
      role: profile.user.role,
      profile: {
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
        birthday: profile.birthday,
        gender: profile.gender,
        bio: profile.bio,
      },
      updatedAt: profile.updatedAt,
    };
  }
}
