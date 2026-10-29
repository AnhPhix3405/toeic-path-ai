import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PolicyThrottlerGuard } from '../../../common/rate-limit/guards/policy-throttler.guard';
import { ThrottlePolicy } from '../../../common/rate-limit/decorators/throttle-policy.decorator';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import {
  ApiAbandonAttemptDoc,
  ApiExamAttemptsControllerDoc,
  ApiStartAttemptDoc,
} from '../docs/exam-attempts.doc';
import { CreateExamAttemptDto } from '../dto/request/create-exam-attempt.dto';
import { ExamAttemptSummaryResponseDto } from '../dto/response/exam-attempt-summary-response.dto';
import { AbandonAttemptResponseDto } from '../dto/response/abandon-attempt-response.dto';
import { ExamAttemptsService } from '../services/exam-attempts.service';
import { UserRole } from '../../../common/enums/user-role.enum';

@ApiTags('Exam Attempts')
@ApiExamAttemptsControllerDoc()
@UseGuards(JwtAuthGuard, PolicyThrottlerGuard)
@Controller('exam-attempts')
export class ExamAttemptsController {
  constructor(private readonly examAttemptsService: ExamAttemptsService) {}

  @Post()
  @ThrottlePolicy('examsMutate')
  @ApiStartAttemptDoc()
  async startAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExamAttemptDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ExamAttemptSummaryResponseDto> {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || undefined;
    const result = await this.examAttemptsService.startAttempt(user.id, dto, ipAddress);

    // Dynamic HTTP Status Code (PMR 021)
    if (result.isResumed) {
      res.status(HttpStatus.OK);
    } else {
      res.status(HttpStatus.CREATED);
    }

    return result;
  }

  @Post(':id/abandon')
  @HttpCode(HttpStatus.OK)
  @ThrottlePolicy('examsMutate')
  @ApiAbandonAttemptDoc()
  async abandonAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AbandonAttemptResponseDto> {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.examAttemptsService.abandonAttempt(user.id, id, isAdmin);
  }
}
