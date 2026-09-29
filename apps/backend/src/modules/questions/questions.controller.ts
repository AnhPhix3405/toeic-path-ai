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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateQuestionDto } from './dto/request/create-question.dto';
import { AssignQuestionGroupDto } from './dto/request/assign-question-group.dto';
import { CreateQuestionOptionDto } from './dto/request/create-question-option.dto';
import { QuestionOptionResponseDto } from './dto/response/question-option-response.dto';
import { QuestionResponseDto } from './dto/response/question-response.dto';
import { SetCorrectAnswerDto } from './dto/request/set-correct-answer.dto';
import { UpdateQuestionOptionDto } from './dto/request/update-question-option.dto';
import { UpdateQuestionDto } from './dto/request/update-question.dto';
import { QuestionsService } from './questions.service';
import { UpdateQuestionClassificationDto } from './dto/request/update-question-classification.dto';

@ApiTags('Questions')
@ApiBearerAuth('JWT-auth')
@ApiUnauthorizedResponse({ description: 'Access token is invalid or absent' })
@ApiForbiddenResponse({
  description: 'Authenticated user has an unsupported role or does not own the question',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a question as a Teacher or Admin' })
  @ApiBody({ type: CreateQuestionDto })
  @ApiCreatedResponse({ type: QuestionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request data' })
  create(
    @Body() dto: CreateQuestionDto,
    @CurrentUser('id') creatorId: string,
  ): Promise<QuestionResponseDto> {
    return this.questionsService.create(dto, creatorId);
  }

  @Get()
  @ApiOperation({ summary: 'List all questions as a Teacher or Admin' })
  @ApiOkResponse({ type: QuestionResponseDto, isArray: true })
  findAll(): Promise<QuestionResponseDto[]> {
    return this.questionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get any question as a Teacher or Admin' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: QuestionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid question id' })
  @ApiNotFoundResponse({ description: 'Question not found' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<QuestionResponseDto> {
    return this.questionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an owned question',
    description:
      'Teachers and Admins may update only questions they created. Admin does not bypass ownership.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateQuestionDto })
  @ApiOkResponse({ type: QuestionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid question id or request data' })
  @ApiNotFoundResponse({ description: 'Question not found' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser('id') actorId: string,
  ): Promise<QuestionResponseDto> {
    return this.questionsService.update(id, dto, actorId);
  }

  @Put(':id/classification')
  @ApiOperation({
    summary: 'Replace the classification of an owned question',
    description:
      'Validates all references and atomically replaces Part, Topics, Skills, and Difficulty. Admin does not bypass ownership.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateQuestionClassificationDto })
  @ApiOkResponse({ type: QuestionResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid id, duplicate ids, or unknown classification reference',
  })
  @ApiNotFoundResponse({ description: 'Question not found' })
  updateClassification(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateQuestionClassificationDto,
    @CurrentUser('id') actorId: string,
  ): Promise<QuestionResponseDto> {
    return this.questionsService.updateClassification(id, dto, actorId);
  }

  @Patch(':id/group')
  @ApiOperation({
    summary: 'Assign or move an owned question to a group',
    description: 'Only the question owner may change its group. Admin does not bypass ownership.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: AssignQuestionGroupDto })
  @ApiOkResponse({ type: QuestionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid id, group id, or group order' })
  @ApiNotFoundResponse({ description: 'Question or question group not found' })
  @ApiConflictResponse({ description: 'The group order is already in use' })
  assignGroup(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignQuestionGroupDto,
    @CurrentUser('id') actorId: string,
  ): Promise<QuestionResponseDto> {
    return this.questionsService.assignGroup(id, dto, actorId);
  }

  @Delete(':id/group')
  @ApiOperation({
    summary: 'Detach an owned question from its group',
    description: 'The question remains available as an independent question.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: QuestionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid question id' })
  @ApiNotFoundResponse({ description: 'Question not found' })
  detachGroup(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') actorId: string,
  ): Promise<QuestionResponseDto> {
    return this.questionsService.detachGroup(id, actorId);
  }

  @Post(':id/options')
  @ApiOperation({
    summary: 'Add an option to an owned question',
    description: 'Only the question owner may manage options. Admin does not bypass ownership.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: CreateQuestionOptionDto })
  @ApiCreatedResponse({ type: QuestionOptionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid question id or option data' })
  @ApiConflictResponse({ description: 'The option position conflicts with an existing option' })
  @ApiNotFoundResponse({ description: 'Question not found' })
  createOption(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateQuestionOptionDto,
    @CurrentUser('id') actorId: string,
  ): Promise<QuestionOptionResponseDto> {
    return this.questionsService.createOption(id, dto, actorId);
  }

  @Patch(':id/options/:optionId')
  @ApiOperation({ summary: 'Update an option of an owned question' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'optionId', format: 'uuid' })
  @ApiBody({ type: UpdateQuestionOptionDto })
  @ApiOkResponse({ type: QuestionOptionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid id or option data' })
  @ApiConflictResponse({ description: 'The option position conflicts with an existing option' })
  @ApiNotFoundResponse({ description: 'Question or option not found' })
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
  @ApiOperation({ summary: 'Delete an option of an owned question' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'optionId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Question option deleted' })
  @ApiBadRequestResponse({ description: 'Invalid question or option id' })
  @ApiNotFoundResponse({ description: 'Question or option not found' })
  removeOption(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('optionId', new ParseUUIDPipe()) optionId: string,
    @CurrentUser('id') actorId: string,
  ): Promise<void> {
    return this.questionsService.removeOption(id, optionId, actorId);
  }

  @Patch(':id/correct-answer')
  @ApiOperation({
    summary: 'Set the correct option for an owned question',
    description:
      'This atomically clears the previous correct option before setting the selected one.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: SetCorrectAnswerDto })
  @ApiOkResponse({ type: QuestionOptionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid question or option id' })
  @ApiNotFoundResponse({ description: 'Question or option not found' })
  setCorrectAnswer(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetCorrectAnswerDto,
    @CurrentUser('id') actorId: string,
  ): Promise<QuestionOptionResponseDto> {
    return this.questionsService.setCorrectAnswer(id, dto, actorId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an owned question',
    description:
      'Teachers and Admins may delete only questions they created. Admin does not bypass ownership.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Question deleted' })
  @ApiBadRequestResponse({ description: 'Invalid question id' })
  @ApiNotFoundResponse({ description: 'Question not found' })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') actorId: string,
  ): Promise<void> {
    return this.questionsService.remove(id, actorId);
  }
}
