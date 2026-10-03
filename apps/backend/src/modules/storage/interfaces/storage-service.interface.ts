export interface UploadAvatarInput {
  ownerId: string;
  buffer: Buffer;
  mimeType: string;
  extension: string;
}

export interface StoredFile {
  url: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

export interface CreatePresignedUploadUrlInput {
  storageKey: string;
  mimeType: string;
  fileSizeBytes: number;
  expiresInSeconds?: number;
  bucket?: string;
}

export interface PresignedUploadUrlResult {
  uploadUrl: string;
  publicUrl: string;
  storageKey: string;
  expiresInSeconds: number;
  httpMethod: 'PUT' | 'POST';
  requiredHeaders?: Record<string, string>;
}

export interface FileMetadataResult {
  sizeBytes: number;
  mimeType?: string;
}

export interface StorageService {
  uploadAvatar(input: UploadAvatarInput): Promise<StoredFile>;
  createPresignedUploadUrl(input: CreatePresignedUploadUrlInput): Promise<PresignedUploadUrlResult>;
  getFileMetadata(storageKey: string, bucket?: string): Promise<FileMetadataResult | null>;
  deleteFile(storageKey: string, bucket?: string): Promise<void>;
}
