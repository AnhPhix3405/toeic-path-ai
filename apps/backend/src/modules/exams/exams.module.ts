import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from './entities/exam.entity';
import { ExamSection } from './entities/exam-section.entity';
import { ExamQuestion } from './entities/exam-question.entity';
import { ToeicPart } from '../questions/entities/toeic-part.entity';
import { ExamsService } from './services/exams.service';
import { ExamsController } from './controllers/exams.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Exam, ExamSection, ExamQuestion, ToeicPart])],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [TypeOrmModule, ExamsService],
})
export class ExamsModule {}
