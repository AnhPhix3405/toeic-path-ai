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
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiCreateQuestionGroupDoc,
  ApiFindAllQuestionGroupsDoc,
  ApiFindOneQuestionGroupDoc,
  ApiQuestionGroupsControllerDoc,
  ApiRemoveQuestionGroupDoc,
  ApiUpdateQuestionGroupDoc,
} from './docs/question-groups.doc';
import { CreateQuestionGroupDto } from './dto/request/create-question-group.dto';
import { UpdateQuestionGroupDto } from './dto/request/update-question-group.dto';
import { QuestionGroupResponseDto } from './dto/response/question-group-response.dto';
import { QuestionGroupsService } from './question-groups.service';

@ApiTags('Question groups')
@ApiQuestionGroupsControllerDoc()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
@Controller('question-groups')
export class QuestionGroupsController {
  constructor(private readonly questionGroupsService: QuestionGroupsService) {}

  @Post()
  @ApiCreateQuestionGroupDoc()
  create(
    @Body() dto: CreateQuestionGroupDto,
    @CurrentUser('id') creatorId: string,
  ): Promise<QuestionGroupResponseDto> {
    return this.questionGroupsService.create(dto, creatorId);
  }

  @Get()
  @ApiFindAllQuestionGroupsDoc()
  findAll(): Promise<QuestionGroupResponseDto[]> {
    return this.questionGroupsService.findAll();
  }

  @Get(':id')
  @ApiFindOneQuestionGroupDoc()
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<QuestionGroupResponseDto> {
    return this.questionGroupsService.findOne(id);
  }

  @Patch(':id')
  @ApiUpdateQuestionGroupDoc()
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateQuestionGroupDto,
    @CurrentUser('id') actorId: string,
  ): Promise<QuestionGroupResponseDto> {
    return this.questionGroupsService.update(id, dto, actorId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiRemoveQuestionGroupDoc()
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') actorId: string,
  ): Promise<void> {
    return this.questionGroupsService.remove(id, actorId);
  }
}
