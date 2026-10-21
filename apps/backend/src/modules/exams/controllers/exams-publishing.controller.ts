import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
  ApiArchiveExamDoc,
  ApiCloseExamDoc,
  ApiExamsPublishingControllerDoc,
  ApiPublishExamDoc,
  ApiUnpublishExamDoc,
} from '../docs/exams-publishing.doc';
import { ChangeExamStatusDto } from '../dto/request/change-exam-status.dto';
import { ExamPublishResultResponseDto } from '../dto/response/exam-publish-result-response.dto';
import { ExamsPublishingService } from '../services/exams-publishing.service';

@ApiTags('Exams Publishing')
@ApiExamsPublishingControllerDoc()
@UseGuards(JwtAuthGuard, RolesGuard, PolicyThrottlerGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
@Controller('exams')
export class ExamsPublishingController {
  constructor(private readonly examsPublishingService: ExamsPublishingService) {}

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ThrottlePolicy('examsMutate')
  @ApiPublishExamDoc()
  async publish(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeExamStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamPublishResultResponseDto> {
    return this.examsPublishingService.publish(id, dto, user);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ThrottlePolicy('examsMutate')
  @ApiUnpublishExamDoc()
  async unpublish(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeExamStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamPublishResultResponseDto> {
    return this.examsPublishingService.unpublish(id, dto, user);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ThrottlePolicy('examsMutate')
  @ApiCloseExamDoc()
  async close(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeExamStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamPublishResultResponseDto> {
    return this.examsPublishingService.close(id, dto, user);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ThrottlePolicy('examsMutate')
  @ApiArchiveExamDoc()
  async archive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeExamStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamPublishResultResponseDto> {
    return this.examsPublishingService.archive(id, dto, user);
  }
}
