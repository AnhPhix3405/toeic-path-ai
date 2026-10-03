import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { MEDIA_LIMITS } from '../../../config/media.config';
import { STORAGE_SERVICE } from '../../storage/storage.constants';
import type { StorageService } from '../../storage/interfaces/storage-service.interface';
import { Question } from '../../questions/entities/question.entity';
import { QuestionGroup } from '../../question-groups/entities/question-group.entity';
import { MediaResource } from '../../questions/entities/media-resource.entity';
import { MediaResourceType } from '../../questions/enums/media-resource-type.enum';
import { QuestionStatus } from '../../questions/enums/question-status.enum';
import { MediaResourceRepository } from '../repositories/media-resource.repository';
import { CreatePresignedUrlDto } from '../dto/request/create-presigned-url.dto';
import { BatchPresignedUrlDto } from '../dto/request/batch-presigned-url.dto';
import { ConfirmMediaUploadDto } from '../dto/request/confirm-media-upload.dto';
import { UpdateMediaTargetDto } from '../dto/request/update-media-target.dto';
import {
  BatchPresignedUrlResponseDto,
  PresignedUrlResponseDto,
} from '../dto/response/presigned-url-response.dto';
import { MediaResourceResponseDto } from '../dto/response/media-resource-response.dto';

export const ALLOWED_MEDIA_MODIFY_STATUSES = [
  QuestionStatus.DRAFT,
  QuestionStatus.REVISION_REQUESTED,
];

@Injectable()
export class MediaService {
  constructor(
    private readonly mediaRepo: MediaResourceRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(QuestionGroup)
    private readonly questionGroupRepo: Repository<QuestionGroup>,
  ) {}

  async createPresignedUrl(
    userId: string,
    dto: CreatePresignedUrlDto,
  ): Promise<PresignedUrlResponseDto> {
    this.validateQuotaAndMime(dto.resourceType, dto.mimeType, dto.fileSize, dto.fileName);

    const ext = this.extractExtension(dto.fileName, dto.resourceType);
    const storageKey = `questions/${dto.resourceType}/${userId}/${randomUUID()}${ext}`;

    const presigned = await this.storageService.createPresignedUploadUrl({
      storageKey,
      mimeType: dto.mimeType,
      fileSizeBytes: dto.fileSize,
      expiresInSeconds: MEDIA_LIMITS.PRESIGNED_URL_TTL_SECONDS,
    });

    return {
      uploadUrl: presigned.uploadUrl,
      storageKey: presigned.storageKey,
      publicUrl: presigned.publicUrl,
      expiresInSeconds: presigned.expiresInSeconds,
      httpMethod: presigned.httpMethod,
      requiredHeaders: presigned.requiredHeaders,
    };
  }

  async createBatchPresignedUrls(
    userId: string,
    dto: BatchPresignedUrlDto,
  ): Promise<BatchPresignedUrlResponseDto> {
    if (
      dto.files.length < MEDIA_LIMITS.BATCH.MIN_ITEMS ||
      dto.files.length > MEDIA_LIMITS.BATCH.MAX_ITEMS
    ) {
      throw new BadRequestException(
        `Số lượng tệp trong một lần xin presigned URL phải từ ${MEDIA_LIMITS.BATCH.MIN_ITEMS} đến ${MEDIA_LIMITS.BATCH.MAX_ITEMS}.`,
      );
    }

    const results = await Promise.all(
      dto.files.map((fileDto) => this.createPresignedUrl(userId, fileDto)),
    );

    return { results };
  }

  async confirmUpload(
    userId: string,
    dto: ConfirmMediaUploadDto,
  ): Promise<MediaResourceResponseDto> {
    if (dto.questionId && dto.questionGroupId) {
      throw new BadRequestException(
        'Tài nguyên chỉ có thể liên kết với questionId HOẶC questionGroupId, không thể gán cả hai.',
      );
    }

    // Security check on storageKey user ownership
    const expectedPrefix = `questions/${dto.resourceType}/${userId}/`;
    if (!dto.storageKey.startsWith(expectedPrefix)) {
      throw new BadRequestException(
        'Khóa lưu trữ không hợp lệ hoặc không thuộc quyền sở hữu của người dùng.',
      );
    }

    // Verify file actually exists on Cloud Storage
    const metadata = await this.storageService.getFileMetadata(dto.storageKey);
    if (!metadata) {
      throw new BadRequestException('Tệp chưa được tải lên dịch vụ lưu trữ hoặc không tồn tại.');
    }

    // Validate real file size from Storage
    const mimeType =
      metadata.mimeType ??
      (dto.resourceType === MediaResourceType.AUDIO ? 'audio/mpeg' : 'image/jpeg');
    this.validateQuotaAndMime(dto.resourceType, mimeType, metadata.sizeBytes, dto.fileName);

    // Whitelist check if target is provided
    if (dto.questionId || dto.questionGroupId) {
      await this.validateTargetAllowed(dto.questionId, dto.questionGroupId);
    }

    const media = this.mediaRepo.create({
      fileName: dto.fileName,
      fileUrl: dto.fileUrl,
      resourceType: dto.resourceType,
      mimeType,
      fileSize: metadata.sizeBytes,
      questionId: dto.questionId ?? null,
      questionGroupId: dto.questionGroupId ?? null,
      isDeleted: false,
      deletedAt: null,
      createdBy: userId,
    });

    const saved = await this.mediaRepo.save(media);
    return this.mapToResponseDto(saved);
  }

  async getMediaById(id: string): Promise<MediaResourceResponseDto> {
    const media = await this.mediaRepo.findActiveById(id);
    if (!media) {
      throw new NotFoundException('Tài nguyên media không tồn tại.');
    }
    return this.mapToResponseDto(media);
  }

  async getMediaByQuestionId(questionId: string): Promise<MediaResourceResponseDto[]> {
    const question = await this.questionRepo.findOneBy({ id: questionId });
    if (!question) {
      throw new NotFoundException('Câu hỏi không tồn tại.');
    }
    const items = await this.mediaRepo.findActiveByQuestionId(questionId);
    return items.map((m) => this.mapToResponseDto(m));
  }

  async getMediaByQuestionGroupId(groupId: string): Promise<MediaResourceResponseDto[]> {
    const group = await this.questionGroupRepo.findOneBy({ id: groupId });
    if (!group) {
      throw new NotFoundException('Nhóm câu hỏi không tồn tại.');
    }
    const items = await this.mediaRepo.findActiveByQuestionGroupId(groupId);
    return items.map((m) => this.mapToResponseDto(m));
  }

  async updateTarget(id: string, dto: UpdateMediaTargetDto): Promise<MediaResourceResponseDto> {
    const media = await this.mediaRepo.findActiveById(id);
    if (!media) {
      throw new NotFoundException('Tài nguyên media không tồn tại.');
    }

    if (dto.questionId && dto.questionGroupId) {
      throw new BadRequestException(
        'Tài nguyên chỉ có thể liên kết với questionId HOẶC questionGroupId, không thể gán cả hai.',
      );
    }

    // Check if current target allows modification
    if (media.questionId || media.questionGroupId) {
      await this.validateTargetAllowed(media.questionId, media.questionGroupId);
    }

    // Check if new target allows modification
    if (dto.questionId || dto.questionGroupId) {
      await this.validateTargetAllowed(dto.questionId, dto.questionGroupId);
    }

    media.questionId = dto.questionId ?? null;
    media.questionGroupId = dto.questionGroupId ?? null;

    const saved = await this.mediaRepo.save(media);
    return this.mapToResponseDto(saved);
  }

  async deleteMedia(id: string): Promise<void> {
    const media = await this.mediaRepo.findActiveById(id);
    if (!media) {
      throw new NotFoundException('Tài nguyên media không tồn tại.');
    }

    // Check Whitelist status constraint
    if (media.questionId || media.questionGroupId) {
      await this.validateTargetAllowed(media.questionId, media.questionGroupId);
    }

    await this.mediaRepo.markAsDeleted(id);
  }

  private validateQuotaAndMime(
    resourceType: MediaResourceType,
    mimeType: string,
    fileSize: number,
    fileName: string,
  ): void {
    const ext = extname(fileName).toLowerCase();

    if (resourceType === MediaResourceType.AUDIO) {
      if (fileSize > MEDIA_LIMITS.AUDIO.MAX_SIZE_BYTES) {
        throw new BadRequestException(
          `Dung lượng tệp audio (${(fileSize / (1024 * 1024)).toFixed(2)} MB) vượt quá giới hạn cho phép (15 MB).`,
        );
      }
      const isMimeAllowed = (MEDIA_LIMITS.AUDIO.ALLOWED_MIME_TYPES as readonly string[]).includes(
        mimeType,
      );
      const isExtAllowed = (MEDIA_LIMITS.AUDIO.ALLOWED_EXTENSIONS as readonly string[]).includes(
        ext,
      );
      if (!isMimeAllowed && !isExtAllowed) {
        throw new BadRequestException(
          `Định dạng tệp audio không hợp lệ. Chỉ chấp nhận các định dạng: ${MEDIA_LIMITS.AUDIO.ALLOWED_EXTENSIONS.join(', ')}.`,
        );
      }
    } else if (resourceType === MediaResourceType.IMAGE) {
      if (fileSize > MEDIA_LIMITS.IMAGE.MAX_SIZE_BYTES) {
        throw new BadRequestException(
          `Dung lượng hình ảnh (${(fileSize / (1024 * 1024)).toFixed(2)} MB) vượt quá giới hạn cho phép (5 MB).`,
        );
      }
      const isMimeAllowed = (MEDIA_LIMITS.IMAGE.ALLOWED_MIME_TYPES as readonly string[]).includes(
        mimeType,
      );
      const isExtAllowed = (MEDIA_LIMITS.IMAGE.ALLOWED_EXTENSIONS as readonly string[]).includes(
        ext,
      );
      if (!isMimeAllowed && !isExtAllowed) {
        throw new BadRequestException(
          `Định dạng hình ảnh không hợp lệ. Chỉ chấp nhận các định dạng: ${MEDIA_LIMITS.IMAGE.ALLOWED_EXTENSIONS.join(', ')}.`,
        );
      }
    } else {
      throw new BadRequestException('Loại tài nguyên không được hỗ trợ.');
    }
  }

  /**
   * Extracts and lowercases the file extension from the provided file name.
   * If the file name lacks an extension, falls back to the canonical extension
   * based on the resource type (.mp3 for Audio, .png for Image).
   */
  private extractExtension(fileName: string, resourceType: MediaResourceType): string {
    const ext = extname(fileName).toLowerCase();
    if (ext) return ext;
    return resourceType === MediaResourceType.AUDIO ? '.mp3' : '.png';
  }

  private async validateTargetAllowed(
    questionId?: string | null,
    questionGroupId?: string | null,
  ): Promise<void> {
    if (questionId) {
      const question = await this.questionRepo.findOneBy({ id: questionId });
      if (!question) {
        throw new NotFoundException('Câu hỏi không tồn tại.');
      }
      if (!ALLOWED_MEDIA_MODIFY_STATUSES.includes(question.status)) {
        throw new BadRequestException(
          `Chỉ được phép thao tác tài nguyên khi câu hỏi ở trạng thái draft hoặc revision_requested (trạng thái hiện tại: ${question.status}).`,
        );
      }
    }

    if (questionGroupId) {
      const group = await this.questionGroupRepo.findOneBy({ id: questionGroupId });
      if (!group) {
        throw new NotFoundException('Nhóm câu hỏi không tồn tại.');
      }
      const invalidCount = await this.questionRepo.count({
        where: {
          questionGroupId,
          status: Not(In(ALLOWED_MEDIA_MODIFY_STATUSES)),
        },
      });
      if (invalidCount > 0) {
        throw new BadRequestException(
          'Không thể thao tác tài nguyên của nhóm câu hỏi có chứa câu hỏi đang chờ duyệt (pending_review) hoặc đã xuất bản (published).',
        );
      }
    }
  }

  private mapToResponseDto(media: MediaResource): MediaResourceResponseDto {
    return {
      id: media.id,
      fileName: media.fileName,
      fileUrl: media.fileUrl,
      resourceType: media.resourceType,
      mimeType: media.mimeType,
      fileSize: media.fileSize,
      questionId: media.questionId,
      questionGroupId: media.questionGroupId,
      createdBy: media.createdBy,
      createdAt: media.createdAt.toISOString(),
      updatedAt: media.updatedAt.toISOString(),
    };
  }
}
