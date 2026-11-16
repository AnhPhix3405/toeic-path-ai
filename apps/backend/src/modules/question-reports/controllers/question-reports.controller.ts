import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { ThrottlePolicy } from '../../../common/rate-limit/decorators/throttle-policy.decorator';
import { PolicyThrottlerGuard } from '../../../common/rate-limit/guards/policy-throttler.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ApiCreateQuestionReportDoc,
  ApiGetMyQuestionReportsDoc,
  ApiGetQuestionReportDetailDoc,
  ApiGetQuestionReportsDoc,
  ApiQuestionReportsControllerDoc,
  ApiResolveQuestionReportDoc,
} from '../docs/question-reports.doc';
import { CreateQuestionReportDto } from '../dto/request/create-question-report.dto';
import { QueryMyQuestionReportsDto } from '../dto/request/query-my-question-reports.dto';
import { QueryQuestionReportsDto } from '../dto/request/query-question-reports.dto';
import { ResolveQuestionReportDto } from '../dto/request/resolve-question-report.dto';
import { QuestionReportDetailResponseDto } from '../dto/response/question-report-detail-response.dto';
import {
  MyQuestionReportItemDto,
  PaginatedAdminQuestionReportsResponseDto,
  PaginatedMyQuestionReportsResponseDto,
  ResolveQuestionReportResponseDto,
} from '../dto/response/question-report-item-response.dto';
import { QuestionReportsService } from '../services/question-reports.service';

@ApiTags('Question Reports')
@ApiQuestionReportsControllerDoc()
@UseGuards(JwtAuthGuard, RolesGuard, PolicyThrottlerGuard)
@Controller()
export class QuestionReportsController {
  constructor(private readonly questionReportsService: QuestionReportsService) {}

  @Post('questions/:questionId/reports')
  @HttpCode(HttpStatus.CREATED)
  @ThrottlePolicy('examsMutate')
  @ApiCreateQuestionReportDoc()
  async createReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: CreateQuestionReportDto,
  ): Promise<MyQuestionReportItemDto> {
    return this.questionReportsService.createReport(user.id, questionId, dto);
  }

  // PMR 028 & PMR 031: Declare static @Get('question-reports/my') BEFORE dynamic @Get('question-reports/:id')
  @Get('question-reports/my')
  @ThrottlePolicy('questionsSearch')
  @ApiGetMyQuestionReportsDoc()
  async getMyReports(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryMyQuestionReportsDto,
  ): Promise<PaginatedMyQuestionReportsResponseDto> {
    return this.questionReportsService.getMyReports(user.id, query);
  }

  @Get('question-reports')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ThrottlePolicy('questionsSearch')
  @ApiGetQuestionReportsDoc()
  async getReportsForManagement(
    @Query() query: QueryQuestionReportsDto,
  ): Promise<PaginatedAdminQuestionReportsResponseDto> {
    return this.questionReportsService.getReportsForManagement(query);
  }

  @Get('question-reports/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ThrottlePolicy('questionsSearch')
  @ApiGetQuestionReportDetailDoc()
  async getReportDetail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuestionReportDetailResponseDto> {
    return this.questionReportsService.getReportDetail(id);
  }

  @Patch('question-reports/:id/resolve')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ThrottlePolicy('examsMutate')
  @ApiResolveQuestionReportDoc()
  async resolveReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveQuestionReportDto,
  ): Promise<ResolveQuestionReportResponseDto> {
    return this.questionReportsService.resolveReport(user.id, id, dto);
  }
}
