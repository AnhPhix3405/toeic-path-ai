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
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { CreateQuestionGroupDto } from './dto/create-question-group.dto';
import { QuestionGroupResponseDto } from './dto/question-group-response.dto';
import { UpdateQuestionGroupDto } from './dto/update-question-group.dto';
import { QuestionGroupsService } from './question-groups.service';

@ApiTags('Question groups')
@ApiBearerAuth('JWT-auth')
@ApiUnauthorizedResponse({ description: 'Access token is invalid or absent' })
@ApiForbiddenResponse({
  description: 'Authenticated user has an unsupported role or does not own the group',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
@Controller('question-groups')
export class QuestionGroupsController {
  constructor(private readonly questionGroupsService: QuestionGroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a question group as a Teacher or Admin' })
  @ApiBody({ type: CreateQuestionGroupDto })
  @ApiCreatedResponse({ type: QuestionGroupResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request data' })
  create(
    @Body() dto: CreateQuestionGroupDto,
    @CurrentUser('id') creatorId: string,
  ): Promise<QuestionGroupResponseDto> {
    return this.questionGroupsService.create(dto, creatorId);
  }

  @Get()
  @ApiOperation({ summary: 'List all question groups as a Teacher or Admin' })
  @ApiOkResponse({ type: QuestionGroupResponseDto, isArray: true })
  findAll(): Promise<QuestionGroupResponseDto[]> {
    return this.questionGroupsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get any question group and its ordered questions' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: QuestionGroupResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid question group id' })
  @ApiNotFoundResponse({ description: 'Question group not found' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<QuestionGroupResponseDto> {
    return this.questionGroupsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an owned question group',
    description: 'Admin does not bypass ownership.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateQuestionGroupDto })
  @ApiOkResponse({ type: QuestionGroupResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid question group id or request data' })
  @ApiNotFoundResponse({ description: 'Question group not found' })
  @ApiConflictResponse({ description: 'Question group update conflicts with existing data' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateQuestionGroupDto,
    @CurrentUser('id') actorId: string,
  ): Promise<QuestionGroupResponseDto> {
    return this.questionGroupsService.update(id, dto, actorId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an owned question group and detach its questions',
    description: 'Questions are not deleted. Admin does not bypass ownership.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Question group deleted and questions detached' })
  @ApiBadRequestResponse({ description: 'Invalid question group id' })
  @ApiNotFoundResponse({ description: 'Question group not found' })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') actorId: string,
  ): Promise<void> {
    return this.questionGroupsService.remove(id, actorId);
  }
}
