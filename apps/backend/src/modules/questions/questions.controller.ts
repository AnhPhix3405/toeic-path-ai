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
import { CreateQuestionDto } from './dto/create-question.dto';
import { AssignQuestionGroupDto } from './dto/assign-question-group.dto';
import { QuestionResponseDto } from './dto/question-response.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsService } from './questions.service';

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
