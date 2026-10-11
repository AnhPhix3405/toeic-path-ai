import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mediaService } from './media.service';
import { apiClient } from './api-client';
import type {
  CreatePresignedUrlDto,
  BatchPresignedUrlDto,
  ConfirmMediaUploadDto,
  UpdateMediaTargetDto,
  MediaResource,
  PresignedUrlResult,
} from '@/types/media';

vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('MediaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPresignedResult: PresignedUrlResult = {
    uploadUrl: 'https://storage.example.com/upload-target',
    storageKey: 'questions/audio/user-123/sample.mp3',
    publicUrl: 'https://storage.example.com/public/sample.mp3',
    expiresInSeconds: 900,
    httpMethod: 'PUT',
    requiredHeaders: { 'Content-Type': 'audio/mpeg' },
  };

  const mockMediaResource: MediaResource = {
    id: 'media-uuid-1',
    fileName: 'sample.mp3',
    fileUrl: 'https://storage.example.com/public/sample.mp3',
    resourceType: 'audio',
    mimeType: 'audio/mpeg',
    fileSize: 1048576,
    questionId: 'q-uuid-1',
    questionGroupId: null,
    createdBy: 'user-uuid-1',
    createdAt: '2026-10-11T12:00:00.000Z',
    updatedAt: '2026-10-11T12:00:00.000Z',
  };

  const mockApiRes = <T>(data: T) => ({
    success: true,
    data,
    timestamp: '2026-10-11T12:00:00.000Z',
    statusCode: 200,
  });

  describe('createPresignedUrl', () => {
    it('gọi POST /media/presigned-url với đúng payload', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockApiRes(mockPresignedResult));

      const dto: CreatePresignedUrlDto = {
        fileName: 'sample.mp3',
        resourceType: 'audio',
        mimeType: 'audio/mpeg',
        fileSize: 1048576,
      };

      const result = await mediaService.createPresignedUrl(dto);

      expect(apiClient.post).toHaveBeenCalledWith('/media/presigned-url', dto);
      expect(result).toEqual(mockPresignedResult);
    });

    it('xử lý chính xác cả khi backend trả về direct DTO không bọc data envelope', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockPresignedResult as any);

      const dto: CreatePresignedUrlDto = {
        fileName: 'lesson2_1.jpg',
        resourceType: 'image',
        mimeType: 'image/jpeg',
        fileSize: 204800,
      };

      const result = await mediaService.createPresignedUrl(dto);
      expect(result).toEqual(mockPresignedResult);
      expect(result.uploadUrl).toBe(mockPresignedResult.uploadUrl);
    });
  });

  describe('createBatchPresignedUrls', () => {
    it('gọi POST /media/presigned-url/batch với đúng danh sách tệp', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce(
        mockApiRes({ results: [mockPresignedResult] }),
      );

      const dto: BatchPresignedUrlDto = {
        files: [
          {
            fileName: 'sample.mp3',
            resourceType: 'audio',
            mimeType: 'audio/mpeg',
            fileSize: 1048576,
          },
        ],
      };

      const result = await mediaService.createBatchPresignedUrls(dto);

      expect(apiClient.post).toHaveBeenCalledWith('/media/presigned-url/batch', dto);
      expect(result.results).toHaveLength(1);
    });
  });

  describe('confirmUpload', () => {
    it('gọi POST /media/confirm và lọc payload an toàn với ValidationPipe', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockApiRes(mockMediaResource));

      const dto: ConfirmMediaUploadDto = {
        fileName: 'sample.mp3',
        fileUrl: 'https://storage.example.com/public/sample.mp3',
        storageKey: 'questions/audio/user-123/sample.mp3',
        resourceType: 'audio',
        mimeType: 'audio/mpeg',
        fileSize: 1048576,
        questionId: 'q-uuid-1',
        questionGroupId: null,
      };

      const result = await mediaService.confirmUpload(dto);

      expect(apiClient.post).toHaveBeenCalledWith('/media/confirm', {
        fileName: 'sample.mp3',
        fileUrl: 'https://storage.example.com/public/sample.mp3',
        storageKey: 'questions/audio/user-123/sample.mp3',
        resourceType: 'audio',
        questionId: 'q-uuid-1',
        questionGroupId: null,
      });
      expect(result).toEqual(mockMediaResource);
    });
  });

  describe('getMediaById', () => {
    it('gọi GET /media/:id', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockApiRes(mockMediaResource));

      const result = await mediaService.getMediaById('media-uuid-1');

      expect(apiClient.get).toHaveBeenCalledWith('/media/media-uuid-1');
      expect(result).toEqual(mockMediaResource);
    });
  });

  describe('getMediaByQuestionId', () => {
    it('gọi GET /media/question/:questionId', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockApiRes([mockMediaResource]));

      const result = await mediaService.getMediaByQuestionId('q-uuid-1');

      expect(apiClient.get).toHaveBeenCalledWith('/media/question/q-uuid-1');
      expect(result).toEqual([mockMediaResource]);
    });
  });

  describe('getMediaByQuestionGroupId', () => {
    it('gọi GET /media/group/:groupId', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockApiRes([mockMediaResource]));

      const result = await mediaService.getMediaByQuestionGroupId('group-uuid-1');

      expect(apiClient.get).toHaveBeenCalledWith('/media/group/group-uuid-1');
      expect(result).toEqual([mockMediaResource]);
    });
  });

  describe('updateTarget', () => {
    it('gọi PATCH /media/:id/target với target mới', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce(mockApiRes(mockMediaResource));

      const dto: UpdateMediaTargetDto = {
        questionId: 'q-uuid-2',
        questionGroupId: null,
      };

      const result = await mediaService.updateTarget('media-uuid-1', dto);

      expect(apiClient.patch).toHaveBeenCalledWith('/media/media-uuid-1/target', dto);
      expect(result).toEqual(mockMediaResource);
    });
  });

  describe('deleteMedia', () => {
    it('gọi DELETE /media/:id', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce(mockApiRes(null));

      await mediaService.deleteMedia('media-uuid-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/media/media-uuid-1');
    });
  });

  describe('validateMediaFile', () => {
    it('chấp nhận file audio mp3 hợp lệ dưới 15MB', () => {
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
      const result = mediaService.validateMediaFile(file, 'audio');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('từ chối file audio vượt quá 15MB', () => {
      const largeFile = {
        name: 'huge.mp3',
        size: 16 * 1024 * 1024,
        type: 'audio/mpeg',
      } as unknown as File;

      const result = mediaService.validateMediaFile(largeFile, 'audio');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('15 MB');
    });

    it('từ chối file hình ảnh vượt quá 5MB', () => {
      const largeImage = {
        name: 'huge.png',
        size: 6 * 1024 * 1024,
        type: 'image/png',
      } as unknown as File;

      const result = mediaService.validateMediaFile(largeImage, 'image');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('5 MB');
    });

    it('từ chối định dạng tệp không được hỗ trợ', () => {
      const badFile = new File(['text content'], 'test.pdf', { type: 'application/pdf' });
      const result = mediaService.validateMediaFile(badFile, 'audio');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('không hợp lệ');
    });
  });
});
