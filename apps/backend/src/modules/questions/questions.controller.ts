import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignQuestionGroupDto } from './dto/request/assign-question-group.dto';
import { CreateQuestionOptionDto } from './dto/request/create-question-option.dto';
import { CreateQuestionDto } from './dto/request/create-question.dto';
import { QueryQuestionsDto } from './dto/request/query-questions.dto';
import { SetCorrectAnswerDto } from './dto/request/set-correct-answer.dto';
import { UpdateQuestionClassificationDto } from './dto/request/update-question-classification.dto';
import { UpdateQuestionOptionDto } from './dto/request/update-question-option.dto';
import { UpdateQuestionDto } from './dto/request/update-question.dto';
import { PaginatedQuestionsResponseDto } from './dto/response/paginated-questions-response.dto';
import { QuestionOptionResponseDto } from './dto/response/question-option-response.dto';
import { QuestionResponseDto } from './dto/response/question-response.dto';
import {
  ApiAssignQuestionGroupDoc,
  ApiCreateQuestionDoc,
  ApiCreateQuestionOptionDoc,
  ApiDetachQuestionGroupDoc,
  ApiFindQuestionDoc,
  ApiFindQuestionsDoc,
  ApiQuestionsControllerDoc,
  ApiRemoveQuestionDoc,
  ApiRemoveQuestionOptionDoc,
  ApiSetCorrectAnswerDoc,
  ApiUpdateQuestionClassificationDoc,
  ApiUpdateQuestionDoc,
  ApiUpdateQuestionOptionDoc,
} from './docs/questions.doc';
import { QuestionsService } from './questions.service';

@ApiTags('Questions')
@ApiQuestionsControllerDoc()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @ApiCreateQuestionDoc()
  create(
    @Body() dto: CreateQuestionDto,
    @CurrentUser('id') creatorId: string,
  ): Promise<QuestionResponseDto> {
    return this.questionsService.create(dto, creatorId);
  }

  @Get()
  @ApiFindQuestionsDoc()
  findPaginated(@Query() dto: QueryQuestionsDto): Promise<PaginatedQuestionsResponseDto> {
    return this.questionsService.findPaginated(dto);
  }

  @Get(':id')
  @ApiFindQuestionDoc()
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<QuestionResponseDto> {
    return this.questionsService.findOne(id);
  }

  @Patch(':id')
  @ApiUpdateQuestionDoc()
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser('id') actorId: string,
  ): Promise<QuestionResponseDto> {
    return this.questionsService.update(id, dto, actorId);
  }

  @Put(':id/classification')
  @ApiUpdateQuestionClassificationDoc()
  updateClassification(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateQuestionClassificationDto,
    @CurrentUser('id') actorId: string,
  ): Promise<QuestionResponseDto> {
    return this.questionsService.updateClassification(id, dto, actorId);
  }

  @Patch(':id/group')
  @ApiAssignQuestionGroupDoc()
  assignGroup(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignQuestionGroupDto,
    @CurrentUser('id') actorId: string,
  ): Promise<QuestionResponseDto> {
    return this.questionsService.assignGroup(id, dto, actorId);
  }

  @Delete(':id/group')
  @ApiDetachQuestionGroupDoc()
  detachGroup(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') actorId: string,
  ): Promise<QuestionResponseDto> {
    return this.questionsService.detachGroup(id, actorId);
  }

  @Post(':id/options')
  @ApiCreateQuestionOptionDoc()
  createOption(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateQuestionOptionDto,
    @CurrentUser('id') actorId: string,
  ): Promise<QuestionOptionResponseDto> {
    return this.questionsService.createOption(id, dto, actorId);
  }

  @Patch(':id/options/:optionId')
  @ApiUpdateQuestionOptionDoc()
  updateOption(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('optionId', new ParseUUIDPipe()) optionId: string,
    @Body() dto: UpdateQuestionOptionDto,
    @CurrentUser('id') actorId: string,
  ): Promise<QuestionOptionResponseDto> {
    return this.questionsService.updateOption(id, optionId, dto, actorId);
  }

  @Delete(':id/options/:optionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiRemoveQuestionOptionDoc()
  removeOption(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('optionId', new ParseUUIDPipe()) optionId: string,
    @CurrentUser('id') actorId: string,
  ): Promise<void> {
    return this.questionsService.removeOption(id, optionId, actorId);
  }

  @Patch(':id/correct-answer')
  @ApiSetCorrectAnswerDoc()
  setCorrectAnswer(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetCorrectAnswerDto,
    @CurrentUser('id') actorId: string,
  ): Promise<QuestionOptionResponseDto> {
    return this.questionsService.setCorrectAnswer(id, dto, actorId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiRemoveQuestionDoc()
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') actorId: string,
  ): Promise<void> {
    return this.questionsService.remove(id, actorId);
  }
}
