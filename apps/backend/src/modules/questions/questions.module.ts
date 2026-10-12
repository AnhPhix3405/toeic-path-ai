import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuestionGroupsModule } from '../question-groups/question-groups.module';
import { StorageModule } from '../storage/storage.module';
import { QuestionGroup } from '../question-groups/entities/question-group.entity';
import { QuestionOption } from './entities/question-option.entity';
import { Question } from './entities/question.entity';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { ToeicPart } from './entities/toeic-part.entity';
import { Topic } from './entities/topic.entity';
import { Skill } from './entities/skill.entity';
import { MediaResource } from './entities/media-resource.entity';
import { QuestionHistory } from './entities/question-history.entity';
import { QuestionReview } from './entities/question-review.entity';
import { ImportJob } from './entities/import-job.entity';
import { ClassificationCatalogController } from './classification-catalog.controller';
import { ClassificationCatalogService } from './classification-catalog.service';
import { QuestionRepository } from './repositories/question.repository';
import { QuestionsImportController } from './controllers/questions-import.controller';
import { TemplateGeneratorService } from './services/template-generator.service';
import { ZipExtractorService } from './services/zip-extractor.service';
import { ExcelParserService } from './services/excel-parser.service';
import { QuestionsImportService } from './services/questions-import.service';
import { ImportQuestionsProcessor } from './processors/import-questions.processor';
import { IMPORT_LIMITS } from '../../config/import.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Question,
      QuestionGroup,
      QuestionOption,
      ToeicPart,
      Topic,
      Skill,
      MediaResource,
      QuestionHistory,
      QuestionReview,
      ImportJob,
    ]),
    QuestionGroupsModule,
    StorageModule,
    BullModule.registerQueue({
      name: IMPORT_LIMITS.QUEUE_NAME,
    }),
  ],
  controllers: [QuestionsController, QuestionsImportController, ClassificationCatalogController],
  providers: [
    QuestionsService,
    ClassificationCatalogService,
    QuestionRepository,
    TemplateGeneratorService,
    ZipExtractorService,
    ExcelParserService,
    QuestionsImportService,
    ImportQuestionsProcessor,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    QuestionsService,
    QuestionsImportService,
    TemplateGeneratorService,
    QuestionRepository,
    TypeOrmModule,
  ],
})
export class QuestionsModule {}
