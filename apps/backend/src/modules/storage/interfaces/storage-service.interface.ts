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

export interface StorageService {
  uploadAvatar(input: UploadAvatarInput): Promise<StoredFile>;
  deleteFile(storageKey: string): Promise<void>;
}
