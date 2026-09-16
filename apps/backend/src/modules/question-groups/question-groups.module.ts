import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuestionGroup } from './entities/question-group.entity';
import { QuestionGroupsController } from './question-groups.controller';
import { QuestionGroupsService } from './question-groups.service';

@Module({
  imports: [TypeOrmModule.forFeature([QuestionGroup])],
  controllers: [QuestionGroupsController],
  providers: [QuestionGroupsService, JwtAuthGuard, RolesGuard],
  exports: [QuestionGroupsService],
})
export class QuestionGroupsModule {}
