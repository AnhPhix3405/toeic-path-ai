import { MediaCleanupService } from './media-cleanup.service';
import { MediaResourceRepository } from '../repositories/media-resource.repository';
import { StorageService } from '../../storage/interfaces/storage-service.interface';
import { MediaResource } from '../../questions/entities/media-resource.entity';

describe('MediaCleanupService', () => {
  let service: MediaCleanupService;
  let mediaRepo: jest.Mocked<Partial<MediaResourceRepository>>;
  let storageService: jest.Mocked<Partial<StorageService>>;

  beforeEach(() => {
    mediaRepo = {
      findSoftDeletedForCleanup: jest.fn(),
      delete: jest.fn(),
    };

    storageService = {
      deleteFile: jest.fn(),
    };

    service = new MediaCleanupService(
      mediaRepo as unknown as MediaResourceRepository,
      storageService as unknown as StorageService,
    );
  });

  it('cleans up soft-deleted media files in batches', async () => {
    const item1 = {
      id: '10000000-0000-4000-8000-000000000001',
      fileUrl: 'https://storage.example.com/public/media/questions/audio/1.mp3?token=signed123',
    } as MediaResource;

    const item2 = {
      id: '10000000-0000-4000-8000-000000000002',
      fileUrl: 'https://storage.example.com/public/media/questions/image/2.png',
    } as MediaResource;

    mediaRepo
      .findSoftDeletedForCleanup!.mockResolvedValueOnce([item1, item2])
      .mockResolvedValueOnce([]);

    storageService.deleteFile!.mockResolvedValue();
    mediaRepo.delete!.mockResolvedValue({ raw: [], affected: 1 });

    const result = await service.cleanupSoftDeletedMedia();

    expect(storageService.deleteFile).toHaveBeenCalledWith('questions/audio/1.mp3');
    expect(storageService.deleteFile).toHaveBeenCalledWith('questions/image/2.png');
    expect(mediaRepo.delete).toHaveBeenCalledWith(item1.id);
    expect(mediaRepo.delete).toHaveBeenCalledWith(item2.id);
    expect(result).toEqual({
      deletedCount: 2,
      errorCount: 0,
      batchCount: 1,
    });
  });

  it('isolates errors so failure of one item does not break the batch', async () => {
    const item1 = {
      id: '10000000-0000-4000-8000-000000000001',
      fileUrl: 'questions/audio/corrupted.mp3',
    } as MediaResource;

    const item2 = {
      id: '10000000-0000-4000-8000-000000000002',
      fileUrl: 'questions/image/valid.png',
    } as MediaResource;

    mediaRepo
      .findSoftDeletedForCleanup!.mockResolvedValueOnce([item1, item2])
      .mockResolvedValueOnce([]);

    storageService
      .deleteFile!.mockRejectedValueOnce(new Error('Storage connection timeout'))
      .mockResolvedValueOnce();

    mediaRepo.delete!.mockResolvedValue({ raw: [], affected: 1 });

    const result = await service.cleanupSoftDeletedMedia();

    expect(result.deletedCount).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(mediaRepo.delete).toHaveBeenCalledWith(item2.id);
    expect(mediaRepo.delete).not.toHaveBeenCalledWith(item1.id);
  });

  it('skips execution if already running', async () => {
    mediaRepo.findSoftDeletedForCleanup!.mockImplementation(async () => {
      // While running, call again
      const nested = await service.cleanupSoftDeletedMedia();
      expect(nested.deletedCount).toBe(0);
      return [];
    });

    const result = await service.cleanupSoftDeletedMedia();
    expect(result.batchCount).toBe(0);
  });
});
