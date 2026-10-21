import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from './entities/exam.entity';
import { ExamSection } from './entities/exam-section.entity';
import { ExamQuestion } from './entities/exam-question.entity';
import { ToeicPart } from '../questions/entities/toeic-part.entity';
import { Question } from '../questions/entities/question.entity';
import { QuestionGroup } from '../question-groups/entities/question-group.entity';
import { ExamsService } from './services/exams.service';
import { ExamsStructureService } from './services/exams-structure.service';
import { ExamsController } from './controllers/exams.controller';
import { ExamsStructureController } from './controllers/exams-structure.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exam, ExamSection, ExamQuestion, ToeicPart, Question, QuestionGroup]),
  ],
  controllers: [ExamsController, ExamsStructureController],
  providers: [ExamsService, ExamsStructureService],
  exports: [TypeOrmModule, ExamsService, ExamsStructureService],
})
export class ExamsModule {}
