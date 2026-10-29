import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamAttempt } from './entities/exam-attempt.entity';
import { ExamAttemptSnapshot } from './entities/exam-attempt-snapshot.entity';
import { ExamAttemptAnswer } from './entities/exam-attempt-answer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExamAttempt, ExamAttemptSnapshot, ExamAttemptAnswer])],
  exports: [TypeOrmModule],
})
export class ExamAttemptsModule {}
