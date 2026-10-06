import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { ApiAuthDoc } from '../../../common/decorators/swagger';
import {
  TaxonomyItemResponseDto,
  ToeicPartResponseDto,
} from '../dto/response/classification-response.dto';

export function ApiClassificationCatalogControllerDoc() {
  return applyDecorators(
    ApiAuthDoc({
      unauthorizedDescription: 'Access token is invalid or absent',
      forbiddenDescription: 'Only Teachers and Admins may read classification catalogs',
    }),
    ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' }),
  );
}

export function ApiFindToeicPartsDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'List TOEIC parts available for question classification' }),
    ApiOkResponse({ type: ToeicPartResponseDto, isArray: true }),
  );
}

export function ApiFindTopicsDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'List topics available for question classification' }),
    ApiOkResponse({ type: TaxonomyItemResponseDto, isArray: true }),
  );
}

export function ApiFindSkillsDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'List skills available for question classification' }),
    ApiOkResponse({ type: TaxonomyItemResponseDto, isArray: true }),
  );
}
