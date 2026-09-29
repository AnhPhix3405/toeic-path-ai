import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClassificationCatalogService } from './classification-catalog.service';
import { TaxonomyItemResponseDto, ToeicPartResponseDto } from './dto/response/classification-response.dto';

@ApiTags('Question Classification')
@ApiBearerAuth('JWT-auth')
@ApiUnauthorizedResponse({ description: 'Access token is invalid or absent' })
@ApiForbiddenResponse({ description: 'Only Teachers and Admins may read classification catalogs' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
@Controller()
export class ClassificationCatalogController {
  constructor(private readonly catalogService: ClassificationCatalogService) {}

  @Get('toeic-parts')
  @ApiOperation({ summary: 'List TOEIC parts available for question classification' })
  @ApiOkResponse({ type: ToeicPartResponseDto, isArray: true })
  findToeicParts(): Promise<ToeicPartResponseDto[]> {
    return this.catalogService.findToeicParts();
  }

  @Get('topics')
  @ApiOperation({ summary: 'List topics available for question classification' })
  @ApiOkResponse({ type: TaxonomyItemResponseDto, isArray: true })
  findTopics(): Promise<TaxonomyItemResponseDto[]> {
    return this.catalogService.findTopics();
  }

  @Get('skills')
  @ApiOperation({ summary: 'List skills available for question classification' })
  @ApiOkResponse({ type: TaxonomyItemResponseDto, isArray: true })
  findSkills(): Promise<TaxonomyItemResponseDto[]> {
    return this.catalogService.findSkills();
  }
}
