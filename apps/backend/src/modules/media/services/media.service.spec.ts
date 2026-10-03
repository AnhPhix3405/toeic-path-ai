import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MediaService } from './media.service';
import { MediaResourceRepository } from '../repositories/media-resource.repository';
import { StorageService } from '../../storage/interfaces/storage-service.interface';
import { Question } from '../../questions/entities/question.entity';
import { QuestionGroup } from '../../question-groups/entities/question-group.entity';
import { MediaResource } from '../../questions/entities/media-resource.entity';
import { MediaResourceType } from '../../questions/enums/media-resource-type.enum';
import { QuestionStatus } from '../../questions/enums/question-status.enum';

describe('MediaService', () => {
  let service: MediaService;
  let mediaRepo: jest.Mocked<Partial<MediaResourceRepository>>;
  let storageService: jest.Mocked<Partial<StorageService>>;
  let questionRepo: jest.Mocked<Partial<Repository<Question>>>;
  let questionGroupRepo: jest.Mocked<Partial<Repository<QuestionGroup>>>;

  const userId = '10000000-0000-4000-8000-000000000001';
  const questionId = '20000000-0000-4000-8000-000000000001';
  const questionGroupId = '30000000-0000-4000-8000-000000000001';
  const mediaId = '40000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    mediaRepo = {
      create: jest.fn((entity) => entity as MediaResource),
      save: jest.fn(
        async (entity) =>
          ({
            id: mediaId,
            createdAt: new Date('2026-10-02T10:00:00Z'),
            updatedAt: new Date('2026-10-02T10:00:00Z'),
            ...entity,
          }) as MediaResource,
      ),
      findActiveById: jest.fn(),
      findActiveByQuestionId: jest.fn(),
      findActiveByQuestionGroupId: jest.fn(),
      markAsDeleted: jest.fn(),
    };

    storageService = {
      createPresignedUploadUrl: jest.fn().mockResolvedValue({
        uploadUrl: 'https://storage.example.com/upload/sign/...',
        publicUrl: 'https://storage.example.com/public/media/...',
        storageKey: `questions/audio/${userId}/uuid.mp3`,
        expiresInSeconds: 900,
        httpMethod: 'PUT',
      }),
      getFileMetadata: jest.fn(),
      deleteFile: jest.fn(),
    };

    questionRepo = {
      findOneBy: jest.fn(),
      count: jest.fn(),
    };

    questionGroupRepo = {
      findOneBy: jest.fn(),
    };

    service = new MediaService(
      mediaRepo as unknown as MediaResourceRepository,
      storageService as unknown as StorageService,
      questionRepo as unknown as Repository<Question>,
      questionGroupRepo as unknown as Repository<QuestionGroup>,
    );
  });

  describe('createPresignedUrl', () => {
    it('creates presigned upload URL for valid audio file (<= 15MB)', async () => {
      const result = await service.createPresignedUrl(userId, {
        fileName: 'part3_audio.mp3',
        resourceType: MediaResourceType.AUDIO,
        mimeType: 'audio/mpeg',
        fileSize: 10 * 1024 * 1024,
      });

      expect(storageService.createPresignedUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          mimeType: 'audio/mpeg',
          fileSizeBytes: 10 * 1024 * 1024,
          expiresInSeconds: 900,
        }),
      );
      expect(result.uploadUrl).toBe('https://storage.example.com/upload/sign/...');
      expect(result.httpMethod).toBe('PUT');
    });

    it('creates presigned upload URL for valid image file (<= 5MB)', async () => {
      const result = await service.createPresignedUrl(userId, {
        fileName: 'part1_image.png',
        resourceType: MediaResourceType.IMAGE,
        mimeType: 'image/png',
        fileSize: 3 * 1024 * 1024,
      });

      expect(result.uploadUrl).toBeDefined();
    });

    it('throws BadRequestException when audio file size exceeds 15MB', async () => {
      await expect(
        service.createPresignedUrl(userId, {
          fileName: 'large_audio.mp3',
          resourceType: MediaResourceType.AUDIO,
          mimeType: 'audio/mpeg',
          fileSize: 16 * 1024 * 1024,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when image file size exceeds 5MB', async () => {
      await expect(
        service.createPresignedUrl(userId, {
          fileName: 'large_image.png',
          resourceType: MediaResourceType.IMAGE,
          mimeType: 'image/png',
          fileSize: 6 * 1024 * 1024,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when mimeType is unsupported', async () => {
      await expect(
        service.createPresignedUrl(userId, {
          fileName: 'video.mp4',
          resourceType: MediaResourceType.AUDIO,
          mimeType: 'video/mp4',
          fileSize: 1024 * 1024,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createBatchPresignedUrls', () => {
    it('creates multiple presigned URLs (batch)', async () => {
      const result = await service.createBatchPresignedUrls(userId, {
        files: [
          {
            fileName: 'audio.mp3',
            resourceType: MediaResourceType.AUDIO,
            mimeType: 'audio/mpeg',
            fileSize: 1024 * 1024,
          },
          {
            fileName: 'image.jpg',
            resourceType: MediaResourceType.IMAGE,
            mimeType: 'image/jpeg',
            fileSize: 1024 * 1024,
          },
        ],
      });

      expect(result.results).toHaveLength(2);
    });

    it('throws BadRequestException when batch size is 0 or > 10', async () => {
      await expect(service.createBatchPresignedUrls(userId, { files: [] })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('confirmUpload', () => {
    it('throws BadRequestException when both questionId and questionGroupId are provided', async () => {
      await expect(
        service.confirmUpload(userId, {
          fileName: 'audio.mp3',
          fileUrl: 'https://storage.example.com/audio.mp3',
          storageKey: `questions/audio/${userId}/uuid.mp3`,
          resourceType: MediaResourceType.AUDIO,
          questionId,
          questionGroupId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when storageKey does not belong to user', async () => {
      await expect(
        service.confirmUpload(userId, {
          fileName: 'audio.mp3',
          fileUrl: 'https://storage.example.com/audio.mp3',
          storageKey: `questions/audio/another-user-id/uuid.mp3`,
          resourceType: MediaResourceType.AUDIO,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when file is not found on Cloud Storage', async () => {
      storageService.getFileMetadata!.mockResolvedValue(null);

      await expect(
        service.confirmUpload(userId, {
          fileName: 'audio.mp3',
          fileUrl: 'https://storage.example.com/audio.mp3',
          storageKey: `questions/audio/${userId}/uuid.mp3`,
          resourceType: MediaResourceType.AUDIO,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when real storage file size exceeds quota', async () => {
      storageService.getFileMetadata!.mockResolvedValue({
        sizeBytes: 20 * 1024 * 1024, // 20 MB > 15MB
        mimeType: 'audio/mpeg',
      });

      await expect(
        service.confirmUpload(userId, {
          fileName: 'audio.mp3',
          fileUrl: 'https://storage.example.com/audio.mp3',
          storageKey: `questions/audio/${userId}/uuid.mp3`,
          resourceType: MediaResourceType.AUDIO,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when attached question is pending_review', async () => {
      storageService.getFileMetadata!.mockResolvedValue({
        sizeBytes: 1024 * 1024,
        mimeType: 'audio/mpeg',
      });
      questionRepo.findOneBy!.mockResolvedValue({
        id: questionId,
        status: QuestionStatus.PENDING_REVIEW,
      } as Question);

      await expect(
        service.confirmUpload(userId, {
          fileName: 'audio.mp3',
          fileUrl: 'https://storage.example.com/audio.mp3',
          storageKey: `questions/audio/${userId}/uuid.mp3`,
          resourceType: MediaResourceType.AUDIO,
          questionId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when attached question is published', async () => {
      storageService.getFileMetadata!.mockResolvedValue({
        sizeBytes: 1024 * 1024,
        mimeType: 'audio/mpeg',
      });
      questionRepo.findOneBy!.mockResolvedValue({
        id: questionId,
        status: QuestionStatus.PUBLISHED,
      } as Question);

      await expect(
        service.confirmUpload(userId, {
          fileName: 'audio.mp3',
          fileUrl: 'https://storage.example.com/audio.mp3',
          storageKey: `questions/audio/${userId}/uuid.mp3`,
          resourceType: MediaResourceType.AUDIO,
          questionId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully confirms upload when attached question is draft', async () => {
      storageService.getFileMetadata!.mockResolvedValue({
        sizeBytes: 2 * 1024 * 1024,
        mimeType: 'audio/mpeg',
      });
      questionRepo.findOneBy!.mockResolvedValue({
        id: questionId,
        status: QuestionStatus.DRAFT,
      } as Question);

      const result = await service.confirmUpload(userId, {
        fileName: 'audio.mp3',
        fileUrl: 'https://storage.example.com/public/media/questions/audio/1.mp3',
        storageKey: `questions/audio/${userId}/uuid.mp3`,
        resourceType: MediaResourceType.AUDIO,
        questionId,
      });

      expect(result.id).toBe(mediaId);
      expect(result.fileName).toBe('audio.mp3');
      expect(result.fileSize).toBe(2 * 1024 * 1024);
      expect(result.questionId).toBe(questionId);
    });

    it('successfully confirms upload when attached question is revision_requested', async () => {
      storageService.getFileMetadata!.mockResolvedValue({
        sizeBytes: 1024 * 1024,
        mimeType: 'audio/mpeg',
      });
      questionRepo.findOneBy!.mockResolvedValue({
        id: questionId,
        status: QuestionStatus.REVISION_REQUESTED,
      } as Question);

      const result = await service.confirmUpload(userId, {
        fileName: 'audio.mp3',
        fileUrl: 'https://storage.example.com/public/media/questions/audio/1.mp3',
        storageKey: `questions/audio/${userId}/uuid.mp3`,
        resourceType: MediaResourceType.AUDIO,
        questionId,
      });

      expect(result.id).toBe(mediaId);
    });
  });

  describe('getMediaById', () => {
    it('returns media details when found', async () => {
      mediaRepo.findActiveById!.mockResolvedValue({
        id: mediaId,
        fileName: 'audio.mp3',
        fileUrl: 'https://storage.example.com/audio.mp3',
        resourceType: MediaResourceType.AUDIO,
        mimeType: 'audio/mpeg',
        fileSize: 1024,
        questionId: null,
        questionGroupId: null,
        createdBy: userId,
        createdAt: new Date('2026-10-02T10:00:00Z'),
        updatedAt: new Date('2026-10-02T10:00:00Z'),
      } as MediaResource);

      const result = await service.getMediaById(mediaId);
      expect(result.id).toBe(mediaId);
    });

    it('throws NotFoundException when media is not found', async () => {
      mediaRepo.findActiveById!.mockResolvedValue(null);

      await expect(service.getMediaById(mediaId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTarget', () => {
    it('throws BadRequestException when setting target to a published question', async () => {
      mediaRepo.findActiveById!.mockResolvedValue({
        id: mediaId,
        questionId: null,
        questionGroupId: null,
      } as MediaResource);

      questionRepo.findOneBy!.mockResolvedValue({
        id: questionId,
        status: QuestionStatus.PUBLISHED,
      } as Question);

      await expect(service.updateTarget(mediaId, { questionId })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('successfully updates target to a draft question', async () => {
      mediaRepo.findActiveById!.mockResolvedValue({
        id: mediaId,
        fileName: 'image.png',
        fileUrl: 'https://storage.example.com/image.png',
        resourceType: MediaResourceType.IMAGE,
        mimeType: 'image/png',
        fileSize: 1024,
        questionId: null,
        questionGroupId: null,
        createdBy: userId,
        createdAt: new Date('2026-10-02T10:00:00Z'),
        updatedAt: new Date('2026-10-02T10:00:00Z'),
      } as MediaResource);

      questionRepo.findOneBy!.mockResolvedValue({
        id: questionId,
        status: QuestionStatus.DRAFT,
      } as Question);

      const result = await service.updateTarget(mediaId, { questionId });
      expect(result.questionId).toBe(questionId);
    });
  });

  describe('deleteMedia', () => {
    it('throws NotFoundException when media is not found', async () => {
      mediaRepo.findActiveById!.mockResolvedValue(null);

      await expect(service.deleteMedia(mediaId)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when trying to delete media on a pending_review question', async () => {
      mediaRepo.findActiveById!.mockResolvedValue({
        id: mediaId,
        questionId,
        questionGroupId: null,
      } as MediaResource);

      questionRepo.findOneBy!.mockResolvedValue({
        id: questionId,
        status: QuestionStatus.PENDING_REVIEW,
      } as Question);

      await expect(service.deleteMedia(mediaId)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when trying to delete media on a published question', async () => {
      mediaRepo.findActiveById!.mockResolvedValue({
        id: mediaId,
        questionId,
        questionGroupId: null,
      } as MediaResource);

      questionRepo.findOneBy!.mockResolvedValue({
        id: questionId,
        status: QuestionStatus.PUBLISHED,
      } as Question);

      await expect(service.deleteMedia(mediaId)).rejects.toThrow(BadRequestException);
    });

    it('successfully soft deletes media attached to a draft question', async () => {
      mediaRepo.findActiveById!.mockResolvedValue({
        id: mediaId,
        questionId,
        questionGroupId: null,
      } as MediaResource);

      questionRepo.findOneBy!.mockResolvedValue({
        id: questionId,
        status: QuestionStatus.DRAFT,
      } as Question);

      await service.deleteMedia(mediaId);
      expect(mediaRepo.markAsDeleted).toHaveBeenCalledWith(mediaId);
    });
  });
});
