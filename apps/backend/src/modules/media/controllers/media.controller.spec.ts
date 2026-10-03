import { MediaController } from './media.controller';
import { MediaService } from '../services/media.service';
import { MediaResourceType } from '../../questions/enums/media-resource-type.enum';

describe('MediaController', () => {
  let controller: MediaController;
  let service: jest.Mocked<Partial<MediaService>>;

  const userId = '10000000-0000-4000-8000-000000000001';
  const mediaId = '20000000-0000-4000-8000-000000000001';
  const questionId = '30000000-0000-4000-8000-000000000001';
  const groupId = '40000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    service = {
      createPresignedUrl: jest.fn(),
      createBatchPresignedUrls: jest.fn(),
      confirmUpload: jest.fn(),
      getMediaById: jest.fn(),
      getMediaByQuestionId: jest.fn(),
      getMediaByQuestionGroupId: jest.fn(),
      updateTarget: jest.fn(),
      deleteMedia: jest.fn(),
    };

    controller = new MediaController(service as unknown as MediaService);
  });

  it('createPresignedUrl delegates to service', async () => {
    const dto = {
      fileName: 'test.mp3',
      resourceType: MediaResourceType.AUDIO,
      mimeType: 'audio/mpeg',
      fileSize: 1024,
    };
    service.createPresignedUrl!.mockResolvedValue({
      uploadUrl: 'https://upload.example.com',
      storageKey: 'questions/audio/1.mp3',
      publicUrl: 'https://public.example.com/1.mp3',
      expiresInSeconds: 900,
      httpMethod: 'PUT',
    });

    const result = await controller.createPresignedUrl({ id: userId }, dto);

    expect(service.createPresignedUrl).toHaveBeenCalledWith(userId, dto);
    expect(result.uploadUrl).toBe('https://upload.example.com');
  });

  it('createBatchPresignedUrls delegates to service', async () => {
    const dto = {
      files: [
        {
          fileName: 'test.mp3',
          resourceType: MediaResourceType.AUDIO,
          mimeType: 'audio/mpeg',
          fileSize: 1024,
        },
      ],
    };
    service.createBatchPresignedUrls!.mockResolvedValue({ results: [] });

    await controller.createBatchPresignedUrls({ id: userId }, dto);

    expect(service.createBatchPresignedUrls).toHaveBeenCalledWith(userId, dto);
  });

  it('confirmUpload delegates to service', async () => {
    const dto = {
      fileName: 'test.mp3',
      fileUrl: 'https://storage.example.com/test.mp3',
      storageKey: `questions/audio/${userId}/1.mp3`,
      resourceType: MediaResourceType.AUDIO,
    };
    service.confirmUpload!.mockResolvedValue({ id: mediaId } as never);

    const result = await controller.confirmUpload({ id: userId }, dto);

    expect(service.confirmUpload).toHaveBeenCalledWith(userId, dto);
    expect(result.id).toBe(mediaId);
  });

  it('getMediaById delegates to service', async () => {
    service.getMediaById!.mockResolvedValue({ id: mediaId } as never);

    const result = await controller.getMediaById(mediaId);

    expect(service.getMediaById).toHaveBeenCalledWith(mediaId);
    expect(result.id).toBe(mediaId);
  });

  it('getMediaByQuestionId delegates to service', async () => {
    service.getMediaByQuestionId!.mockResolvedValue([{ id: mediaId }] as never);

    const result = await controller.getMediaByQuestionId(questionId);

    expect(service.getMediaByQuestionId).toHaveBeenCalledWith(questionId);
    expect(result).toHaveLength(1);
  });

  it('getMediaByQuestionGroupId delegates to service', async () => {
    service.getMediaByQuestionGroupId!.mockResolvedValue([{ id: mediaId }] as never);

    const result = await controller.getMediaByQuestionGroupId(groupId);

    expect(service.getMediaByQuestionGroupId).toHaveBeenCalledWith(groupId);
    expect(result).toHaveLength(1);
  });

  it('updateTarget delegates to service', async () => {
    const dto = { questionId };
    service.updateTarget!.mockResolvedValue({ id: mediaId, questionId } as never);

    const result = await controller.updateTarget(mediaId, dto);

    expect(service.updateTarget).toHaveBeenCalledWith(mediaId, dto);
    expect(result.questionId).toBe(questionId);
  });

  it('deleteMedia delegates to service', async () => {
    service.deleteMedia!.mockResolvedValue();

    await controller.deleteMedia(mediaId);

    expect(service.deleteMedia).toHaveBeenCalledWith(mediaId);
  });
});
