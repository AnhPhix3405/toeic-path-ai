import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from './entities/exam.entity';
import { ExamSection } from './entities/exam-section.entity';
import { ExamQuestion } from './entities/exam-question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Exam, ExamSection, ExamQuestion])],
  exports: [TypeOrmModule],
})
export class ExamsModule {}
