import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuestionGroupsModule } from '../question-groups/question-groups.module';
import { Question } from './entities/question.entity';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Question]), QuestionGroupsModule],
  controllers: [QuestionsController],
  providers: [QuestionsService, JwtAuthGuard, RolesGuard],
})
export class QuestionsModule {}
