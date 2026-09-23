import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuestionGroupsModule } from '../question-groups/question-groups.module';
import { QuestionOption } from './entities/question-option.entity';
import { Question } from './entities/question.entity';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { ToeicPart } from './entities/toeic-part.entity';
import { Topic } from './entities/topic.entity';
import { Skill } from './entities/skill.entity';
import { ClassificationCatalogController } from './classification-catalog.controller';
import { ClassificationCatalogService } from './classification-catalog.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Question, QuestionOption, ToeicPart, Topic, Skill]),
    QuestionGroupsModule,
  ],
  controllers: [QuestionsController, ClassificationCatalogController],
  providers: [QuestionsService, ClassificationCatalogService, JwtAuthGuard, RolesGuard],
})
export class QuestionsModule {}
