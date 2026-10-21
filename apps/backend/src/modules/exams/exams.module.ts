import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from './entities/exam.entity';
import { ExamSection } from './entities/exam-section.entity';
import { ExamQuestion } from './entities/exam-question.entity';
import { ToeicPart } from '../questions/entities/toeic-part.entity';
import { Question } from '../questions/entities/question.entity';
import { QuestionOption } from '../questions/entities/question-option.entity';
import { QuestionGroup } from '../question-groups/entities/question-group.entity';
import { MediaResource } from '../questions/entities/media-resource.entity';
import { ExamsService } from './services/exams.service';
import { ExamsStructureService } from './services/exams-structure.service';
import { ExamsPublishingService } from './services/exams-publishing.service';
import { ExamsController } from './controllers/exams.controller';
import { ExamsStructureController } from './controllers/exams-structure.controller';
import { ExamsPublishingController } from './controllers/exams-publishing.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exam,
      ExamSection,
      ExamQuestion,
      ToeicPart,
      Question,
      QuestionOption,
      QuestionGroup,
      MediaResource,
    ]),
  ],
  controllers: [ExamsController, ExamsStructureController, ExamsPublishingController],
  providers: [ExamsService, ExamsStructureService, ExamsPublishingService],
  exports: [TypeOrmModule, ExamsService, ExamsStructureService, ExamsPublishingService],
})
export class ExamsModule {}
