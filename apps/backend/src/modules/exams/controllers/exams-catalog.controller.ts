import { Controller, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { ExamsCatalogService } from '../services/exams-catalog.service';
import { QueryExamsDto } from '../dto/request/query-exams.dto';
import { QueryManageExamsDto } from '../dto/request/query-manage-exams.dto';
import { PaginatedExamsCatalogResponseDto } from '../dto/response/paginated-exams-catalog-response.dto';
import { PaginatedManageExamsResponseDto } from '../dto/response/paginated-manage-exams-response.dto';
import { ExamOverviewResponseDto } from '../dto/response/exam-overview-response.dto';
import { PublicLandingSummaryResponseDto } from '../dto/response/public-landing-summary-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { ThrottlePolicy } from '../../../common/rate-limit/decorators/throttle-policy.decorator';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';
import {
  ApiExamOverviewDoc,
  ApiExamsCatalogTag,
  ApiLandingSummaryDoc,
  ApiManageCatalogDoc,
  ApiPublicCatalogDoc,
} from '../docs/exams-catalog.doc';

@Controller('exams')
@ApiExamsCatalogTag()
export class ExamsCatalogController {
  constructor(private readonly catalogService: ExamsCatalogService) {}

  /**
   * Tra cứu danh mục đề thi công khai (Public Catalog) (BR19.1)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @ThrottlePolicy('questionsSearch')
  @ApiPublicCatalogDoc()
  async getPublicCatalog(@Query() query: QueryExamsDto): Promise<PaginatedExamsCatalogResponseDto> {
    return this.catalogService.findPublicCatalog(query);
  }

  /**
   * Tra cứu danh mục đề thi quản trị (Management Catalog) (BR19.2)
   */
  @Get('manage')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiManageCatalogDoc()
  async getManagementCatalog(
    @Query() query: QueryManageExamsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedManageExamsResponseDto> {
    return this.catalogService.findManagementCatalog(query, user);
  }

  /**
   * Lấy thống kê tổng quan & đề thi nổi bật cho Trang chủ công khai
   */
  @Get('landing-summary')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @ThrottlePolicy('questionsSearch')
  @ApiLandingSummaryDoc()
  async getLandingSummary(): Promise<PublicLandingSummaryResponseDto> {
    return this.catalogService.getLandingSummary();
  }

  /**
   * Xem chi tiết tổng quan đề thi với nguyên tắc Zero Answer Leakage (BR19.3)
   */
  @Get(':id/overview')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @ApiExamOverviewDoc()
  async getExamOverview(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser | null,
  ): Promise<ExamOverviewResponseDto> {
    return this.catalogService.getExamOverview(id, user);
  }
}
