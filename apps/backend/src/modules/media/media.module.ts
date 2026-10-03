import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StorageModule } from '../storage/storage.module';
import { MediaResource } from '../questions/entities/media-resource.entity';
import { Question } from '../questions/entities/question.entity';
import { QuestionGroup } from '../question-groups/entities/question-group.entity';
import { MediaResourceRepository } from './repositories/media-resource.repository';
import { MediaService } from './services/media.service';
import { MediaCleanupService } from './services/media-cleanup.service';
import { MediaController } from './controllers/media.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaResource, Question, QuestionGroup]),
    StorageModule,
  ],
  controllers: [MediaController],
  providers: [
    MediaService,
    MediaCleanupService,
    MediaResourceRepository,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [MediaService, MediaResourceRepository],
})
export class MediaModule {}
