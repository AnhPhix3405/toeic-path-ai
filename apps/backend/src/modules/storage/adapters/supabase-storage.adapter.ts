import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type {
  CreatePresignedUploadUrlInput,
  FileMetadataResult,
  PresignedUploadUrlResult,
  StorageService,
  StoredFile,
  UploadAvatarInput,
} from '../interfaces/storage-service.interface';

@Injectable()
export class SupabaseStorageAdapter implements StorageService {
  private readonly baseUrl: string;
  private readonly serviceRoleKey: string;
  private readonly avatarBucket: string;
  private readonly mediaBucket: string;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.getOrThrow<string>('storage.supabaseUrl').replace(/\/$/, '');
    this.serviceRoleKey = configService.getOrThrow<string>('storage.supabaseServiceRoleKey');
    this.avatarBucket = configService.getOrThrow<string>('storage.avatarBucket');
    this.mediaBucket = configService.get<string>('storage.mediaBucket') ?? 'media';
  }

  async uploadAvatar(input: UploadAvatarInput): Promise<StoredFile> {
    const storageKey = `avatars/${input.ownerId}/${randomUUID()}.${input.extension}`;
    const response = await fetch(this.objectUrl(storageKey, this.avatarBucket), {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': input.mimeType, 'x-upsert': 'false' },
      body: new Uint8Array(input.buffer),
    });
    if (!response.ok) throw new BadGatewayException('Avatar storage is unavailable');

    return {
      url: `${this.baseUrl}/storage/v1/object/public/${encodeURIComponent(this.avatarBucket)}/${this.encodeKey(storageKey)}`,
      storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.length,
    };
  }

  async createPresignedUploadUrl(
    input: CreatePresignedUploadUrlInput,
  ): Promise<PresignedUploadUrlResult> {
    const bucket = input.bucket ?? this.mediaBucket;
    const expiresIn = input.expiresInSeconds ?? 900;
    const signUrl = `${this.baseUrl}/storage/v1/object/upload/sign/${encodeURIComponent(bucket)}/${this.encodeKey(input.storageKey)}`;

    try {
      const response = await fetch(signUrl, {
        method: 'POST',
        headers: {
          ...this.authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn }),
      });

      if (!response.ok) {
        throw new BadGatewayException('Failed to generate presigned upload URL from storage');
      }

      const data = (await response.json()) as { url?: string };
      const relativeUrl = data.url ?? '';
      const uploadUrl = relativeUrl.startsWith('http')
        ? relativeUrl
        : `${this.baseUrl}/storage/v1${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;

      const publicUrl = `${this.baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${this.encodeKey(input.storageKey)}`;

      return {
        uploadUrl,
        publicUrl,
        storageKey: input.storageKey,
        expiresInSeconds: expiresIn,
        httpMethod: 'PUT',
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException('Storage service is unavailable');
    }
  }

  async getFileMetadata(storageKey: string, bucket?: string): Promise<FileMetadataResult | null> {
    const targetBucket = bucket ?? this.mediaBucket;
    const infoUrl = `${this.baseUrl}/storage/v1/object/info/authenticated/${encodeURIComponent(targetBucket)}/${this.encodeKey(storageKey)}`;

    try {
      const response = await fetch(infoUrl, {
        method: 'GET',
        headers: this.authHeaders(),
      });

      if (response.status === 404) {
        return null;
      }

      if (response.status === 400) {
        const errJson = (await response.json().catch(() => null)) as {
          statusCode?: string;
          error?: string;
          message?: string;
          code?: string;
        } | null;

        if (
          errJson?.statusCode === '404' ||
          errJson?.error === 'not_found' ||
          errJson?.code === 'NoSuchKey' ||
          errJson?.message?.toLowerCase().includes('not found')
        ) {
          return null;
        }

        throw new BadGatewayException('Failed to verify file metadata from storage');
      }

      if (!response.ok) {
        throw new BadGatewayException('Failed to verify file metadata from storage');
      }

      const data = (await response.json()) as {
        size?: number;
        content_type?: string;
        metadata?: { size?: number; mimetype?: string };
      };

      const sizeBytes =
        typeof data.size === 'number'
          ? data.size
          : typeof data.metadata?.size === 'number'
            ? data.metadata.size
            : 0;
      const mimeType = data.content_type ?? data.metadata?.mimetype ?? undefined;

      return {
        sizeBytes,
        mimeType,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException('Storage service is unavailable');
    }
  }

  async deleteFile(storageKey: string, bucket?: string): Promise<void> {
    const targetBucket = bucket ?? this.mediaBucket;
    const response = await fetch(this.objectUrl(storageKey, targetBucket), {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    if (!response.ok && response.status !== 404) {
      throw new BadGatewayException('Storage service is unavailable');
    }
  }

  private objectUrl(storageKey: string, bucket: string): string {
    return `${this.baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${this.encodeKey(storageKey)}`;
  }

  private encodeKey(storageKey: string): string {
    return storageKey.split('/').map(encodeURIComponent).join('/');
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.serviceRoleKey}`, apikey: this.serviceRoleKey };
  }
}
