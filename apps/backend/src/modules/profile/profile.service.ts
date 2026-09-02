import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../users/entities/user-profile.entity';
import type { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
  ) {}

  async getMyProfile(userId: string): Promise<ProfileResponseDto> {
    const profile = await this.findByUserId(userId);
    return this.toResponse(profile);
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
