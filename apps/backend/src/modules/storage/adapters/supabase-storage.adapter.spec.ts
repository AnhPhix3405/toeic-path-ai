import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseStorageAdapter } from './supabase-storage.adapter';

describe('SupabaseStorageAdapter', () => {
  let adapter: SupabaseStorageAdapter;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'storage.supabaseUrl') return 'https://test-project.supabase.co';
        if (key === 'storage.supabaseServiceRoleKey') return 'test-service-role-key';
        if (key === 'storage.avatarBucket') return 'avatars';
        throw new Error(`Unexpected config key: ${key}`);
      }),
      get: jest.fn((key: string) => {
        if (key === 'storage.mediaBucket') return 'media';
        return undefined;
      }),
    } as unknown as ConfigService;

    adapter = new SupabaseStorageAdapter(configService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createPresignedUploadUrl', () => {
    it('generates a presigned upload URL and public URL', async () => {
      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          url: '/object/upload/sign/media/questions/audio/1.mp3?token=signed-token',
        }),
      } as Response);

      const result = await adapter.createPresignedUploadUrl({
        storageKey: 'questions/audio/1.mp3',
        mimeType: 'audio/mpeg',
        fileSizeBytes: 1048576,
        expiresInSeconds: 900,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-project.supabase.co/storage/v1/object/upload/sign/media/questions/audio/1.mp3',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-service-role-key',
            apikey: 'test-service-role-key',
          }),
        }),
      );

      expect(result.uploadUrl).toBe(
        'https://test-project.supabase.co/storage/v1/object/upload/sign/media/questions/audio/1.mp3?token=signed-token',
      );
      expect(result.publicUrl).toBe(
        'https://test-project.supabase.co/storage/v1/object/public/media/questions/audio/1.mp3',
      );
      expect(result.storageKey).toBe('questions/audio/1.mp3');
      expect(result.expiresInSeconds).toBe(900);
      expect(result.httpMethod).toBe('PUT');
    });

    it('throws BadGatewayException when storage API returns non-ok response', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      await expect(
        adapter.createPresignedUploadUrl({
          storageKey: 'questions/audio/1.mp3',
          mimeType: 'audio/mpeg',
          fileSizeBytes: 1048576,
        }),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe('getFileMetadata', () => {
    it('returns size and mimeType when file exists (HTTP 200)', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ size: 2048576, content_type: 'audio/mpeg' }),
      } as unknown as Response);

      const result = await adapter.getFileMetadata('questions/audio/1.mp3');

      expect(result).toEqual({
        sizeBytes: 2048576,
        mimeType: 'audio/mpeg',
      });
    });

    it('returns null when file does not exist (HTTP 404)', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ statusCode: '404', error: 'not_found', message: 'Object not found' }),
      } as Response);

      const result = await adapter.getFileMetadata('questions/audio/nonexistent.mp3');
      expect(result).toBeNull();
    });

    it('returns null when storage returns HTTP 400 with not_found error payload', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          statusCode: '404',
          error: 'not_found',
          message: 'Object not found',
          code: 'NoSuchKey',
        }),
      } as Response);

      const result = await adapter.getFileMetadata('questions/audio/nonexistent.mp3');
      expect(result).toBeNull();
    });

    it('throws BadGatewayException when storage encounters error (HTTP 500)', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      await expect(adapter.getFileMetadata('questions/audio/1.mp3')).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe('deleteFile', () => {
    it('deletes file successfully from storage', async () => {
      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      await adapter.deleteFile('questions/audio/1.mp3');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-project.supabase.co/storage/v1/object/media/questions/audio/1.mp3',
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });

    it('ignores 404 errors during delete', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      await expect(adapter.deleteFile('questions/audio/nonexistent.mp3')).resolves.not.toThrow();
    });

    it('throws BadGatewayException on other storage delete errors', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      await expect(adapter.deleteFile('questions/audio/1.mp3')).rejects.toThrow(
        BadGatewayException,
      );
    });
  });
});
