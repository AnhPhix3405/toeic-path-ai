import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PolicyThrottlerGuard } from '../../../common/rate-limit/guards/policy-throttler.guard';
import { ThrottlePolicy } from '../../../common/rate-limit/decorators/throttle-policy.decorator';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import {
  ApiCreateExamDoc,
  ApiDeleteExamDoc,
  ApiExamsControllerDoc,
  ApiGetExamManageDoc,
  ApiUpdateExamDoc,
} from '../docs/exams.doc';
import { CreateExamDto } from '../dto/request/create-exam.dto';
import { UpdateExamDto } from '../dto/request/update-exam.dto';
import { ExamDetailResponseDto } from '../dto/response/exam-detail-response.dto';
import { ExamsService } from '../services/exams.service';

@ApiTags('Exams')
@ApiExamsControllerDoc()
@UseGuards(JwtAuthGuard, RolesGuard, PolicyThrottlerGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @ThrottlePolicy('examsMutate')
  @ApiCreateExamDoc()
  async create(
    @Body() dto: CreateExamDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamDetailResponseDto> {
    return this.examsService.create(dto, user);
  }

  @Get(':id/manage')
  @ApiGetExamManageDoc()
  async getManageDetail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamDetailResponseDto> {
    return this.examsService.findManageDetail(id, user);
  }

  @Patch(':id')
  @ThrottlePolicy('examsMutate')
  @ApiUpdateExamDoc()
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateExamDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamDetailResponseDto> {
    return this.examsService.update(id, dto, user);
  }

  @Delete(':id')
  @ThrottlePolicy('examsMutate')
  @ApiDeleteExamDoc()
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.examsService.remove(id, user);
  }
}
