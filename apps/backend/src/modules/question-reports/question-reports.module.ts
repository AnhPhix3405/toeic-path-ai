import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionReport } from './entities/question-report.entity';
import { Question } from '../questions/entities/question.entity';
import { QuestionGroup } from '../question-groups/entities/question-group.entity';
import { ExamAttempt } from '../exam-attempts/entities/exam-attempt.entity';
import { ExamAttemptSnapshot } from '../exam-attempts/entities/exam-attempt-snapshot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionReport,
      Question,
      QuestionGroup,
      ExamAttempt,
      ExamAttemptSnapshot,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class QuestionReportsModule {}
