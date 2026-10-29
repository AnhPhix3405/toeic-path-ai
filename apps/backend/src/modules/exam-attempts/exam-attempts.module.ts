import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamAttempt } from './entities/exam-attempt.entity';
import { ExamAttemptSnapshot } from './entities/exam-attempt-snapshot.entity';
import { ExamAttemptAnswer } from './entities/exam-attempt-answer.entity';
import { Exam } from '../exams/entities/exam.entity';
import { ExamSection } from '../exams/entities/exam-section.entity';
import { ExamQuestion } from '../exams/entities/exam-question.entity';
import { Question } from '../questions/entities/question.entity';
import { QuestionOption } from '../questions/entities/question-option.entity';
import { QuestionGroup } from '../question-groups/entities/question-group.entity';
import { ToeicPart } from '../questions/entities/toeic-part.entity';
import { ExamAttemptsController } from './controllers/exam-attempts.controller';
import { ExamAttemptsService } from './services/exam-attempts.service';
import { SnapshotService } from './services/snapshot.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExamAttempt,
      ExamAttemptSnapshot,
      ExamAttemptAnswer,
      Exam,
      ExamSection,
      ExamQuestion,
      Question,
      QuestionOption,
      QuestionGroup,
      ToeicPart,
    ]),
  ],
  controllers: [ExamAttemptsController],
  providers: [ExamAttemptsService, SnapshotService],
  exports: [TypeOrmModule, ExamAttemptsService, SnapshotService],
})
export class ExamAttemptsModule {}
