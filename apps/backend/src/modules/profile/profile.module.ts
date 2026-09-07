import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserProfile } from '../users/entities/user-profile.entity';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { StorageModule } from '../storage/storage.module';
import { AvatarImageService } from './services/avatar-image.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserProfile]), StorageModule],
  controllers: [ProfileController],
  providers: [ProfileService, AvatarImageService, JwtAuthGuard, RolesGuard],
})
export class ProfileModule {}
