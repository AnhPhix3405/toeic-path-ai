import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClassificationCatalogService } from './classification-catalog.service';
import {
  ApiClassificationCatalogControllerDoc,
  ApiFindSkillsDoc,
  ApiFindToeicPartsDoc,
  ApiFindTopicsDoc,
} from './docs/classification-catalog.doc';
import { TaxonomyItemResponseDto, ToeicPartResponseDto } from './dto/response/classification-response.dto';

@ApiTags('Question Classification')
@ApiClassificationCatalogControllerDoc()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
@Controller()
export class ClassificationCatalogController {
  constructor(private readonly catalogService: ClassificationCatalogService) {}

  @Get('toeic-parts')
  @ApiFindToeicPartsDoc()
  findToeicParts(): Promise<ToeicPartResponseDto[]> {
    return this.catalogService.findToeicParts();
  }

  @Get('topics')
  @ApiFindTopicsDoc()
  findTopics(): Promise<TaxonomyItemResponseDto[]> {
    return this.catalogService.findTopics();
  }

  @Get('skills')
  @ApiFindSkillsDoc()
  findSkills(): Promise<TaxonomyItemResponseDto[]> {
    return this.catalogService.findSkills();
  }
}
