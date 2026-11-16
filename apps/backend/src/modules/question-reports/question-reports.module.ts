import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamAttemptSnapshot } from '../exam-attempts/entities/exam-attempt-snapshot.entity';
import { ExamAttempt } from '../exam-attempts/entities/exam-attempt.entity';
import { QuestionGroup } from '../question-groups/entities/question-group.entity';
import { Question } from '../questions/entities/question.entity';
import { QuestionReportsController } from './controllers/question-reports.controller';
import { QuestionReport } from './entities/question-report.entity';
import { QuestionReportsService } from './services/question-reports.service';

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
  controllers: [QuestionReportsController],
  providers: [QuestionReportsService],
  exports: [TypeOrmModule, QuestionReportsService],
})
export class QuestionReportsModule {}
