import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type {
  StorageService,
  StoredFile,
  UploadAvatarInput,
} from '../interfaces/storage-service.interface';

@Injectable()
export class SupabaseStorageAdapter implements StorageService {
  private readonly baseUrl: string;
  private readonly serviceRoleKey: string;
  private readonly bucket: string;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.getOrThrow<string>('storage.supabaseUrl').replace(/\/$/, '');
    this.serviceRoleKey = configService.getOrThrow<string>('storage.supabaseServiceRoleKey');
    this.bucket = configService.getOrThrow<string>('storage.avatarBucket');
  }

  async uploadAvatar(input: UploadAvatarInput): Promise<StoredFile> {
    const storageKey = `avatars/${input.ownerId}/${randomUUID()}.${input.extension}`;
    const response = await fetch(this.objectUrl(storageKey), {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': input.mimeType, 'x-upsert': 'false' },
      body: new Uint8Array(input.buffer),
    });
    if (!response.ok) throw new BadGatewayException('Avatar storage is unavailable');

    return {
      url: `${this.baseUrl}/storage/v1/object/public/${encodeURIComponent(this.bucket)}/${this.encodeKey(storageKey)}`,
      storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.length,
    };
  }

  async deleteFile(storageKey: string): Promise<void> {
    const response = await fetch(this.objectUrl(storageKey), {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    if (!response.ok && response.status !== 404) {
      throw new BadGatewayException('Avatar storage is unavailable');
    }
  }

  private objectUrl(storageKey: string): string {
    return `${this.baseUrl}/storage/v1/object/${encodeURIComponent(this.bucket)}/${this.encodeKey(storageKey)}`;
  }

  private encodeKey(storageKey: string): string {
    return storageKey.split('/').map(encodeURIComponent).join('/');
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.serviceRoleKey}`, apikey: this.serviceRoleKey };
  }
}
