import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PolicyThrottlerGuard } from '../../../common/rate-limit/guards/policy-throttler.guard';
import { ThrottlePolicy } from '../../../common/rate-limit/decorators/throttle-policy.decorator';
import { QuestionsImportService } from '../services/questions-import.service';
import { TemplateGeneratorService } from '../services/template-generator.service';
import { ImportQuestionsQueryDto } from '../dto/request/import-questions-query.dto';
import { QueryImportJobsDto } from '../dto/request/query-import-jobs.dto';
import { SubmitForReviewDto } from '../dto/request/submit-for-review.dto';
import {
  ApiDownloadQuestionsTemplateDoc,
  ApiGetImportJobDoc,
  ApiGetImportJobsDoc,
  ApiImportQuestionsDoc,
  ApiQuestionsImportControllerDoc,
  ApiSubmitForReviewDoc,
} from '../docs/questions-import.doc';
import { QuestionStatus } from '../enums/question-status.enum';

@ApiTags('Questions Import')
@ApiQuestionsImportControllerDoc()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
@Controller('questions/import')
export class QuestionsImportController {
  constructor(
    private readonly importService: QuestionsImportService,
    private readonly templateService: TemplateGeneratorService,
  ) {}

  @Get('template')
  @ApiDownloadQuestionsTemplateDoc()
  async downloadTemplate(@Res() res: Response) {
    const template = await this.templateService.generateQuestionsTemplate();
    res.setHeader('Content-Type', template.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${template.fileName}"`);
    return res.send(template.buffer);
  }

  @Post()
  @UseGuards(PolicyThrottlerGuard)
  @ThrottlePolicy('questionsImport')
  @UseInterceptors(FileInterceptor('file'))
  @ApiImportQuestionsDoc()
  async importQuestions(
    @UploadedFile() file: Express.Multer.File,
    @Query() query: ImportQuestionsQueryDto,
    @CurrentUser() user: { id: string; role: UserRole },
    @Res() res: Response,
  ) {
    const targetStatus = query?.targetStatus ?? QuestionStatus.DRAFT;
    const result = await this.importService.processUploadedFile(file, targetStatus, user.id);

    if (result.isAsync) {
      return res.status(HttpStatus.ACCEPTED).json(result);
    }
    return res.status(HttpStatus.CREATED).json(result);
  }

  @Get('jobs/:id')
  @ApiGetImportJobDoc()
  async getImportJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.importService.getImportJobById(id, user.id, isAdmin);
  }

  @Get('jobs')
  @ApiGetImportJobsDoc()
  async getImportJobs(
    @Query() query: QueryImportJobsDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    const isAdmin = user.role === UserRole.ADMIN;
    const { items, total } = await this.importService.getImportJobs(query, user.id, isAdmin);
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const page = query.page && query.page > 0 ? query.page : 1;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((job) => ({
        ...job,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        completedAt: job.completedAt ? job.completedAt.toISOString() : null,
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }

  @Post('submit-for-review')
  @HttpCode(HttpStatus.OK)
  @ApiSubmitForReviewDoc()
  async submitForReview(
    @Body() dto: SubmitForReviewDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.importService.submitForReview(dto.questionIds, user.id, isAdmin);
  }
}
