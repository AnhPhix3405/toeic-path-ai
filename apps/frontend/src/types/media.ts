export type MediaResourceType = 'audio' | 'image';

export interface CreatePresignedUrlDto {
  fileName: string;
  resourceType: MediaResourceType;
  mimeType: string;
  fileSize: number;
}

export interface BatchPresignedUrlDto {
  files: CreatePresignedUrlDto[];
}

export interface PresignedUrlResult {
  uploadUrl: string;
  storageKey: string;
  publicUrl: string;
  expiresInSeconds: number;
  httpMethod: 'PUT' | 'POST';
  requiredHeaders?: Record<string, string>;
}

export interface BatchPresignedUrlResult {
  results: PresignedUrlResult[];
}

export interface ConfirmMediaUploadDto {
  fileName: string;
  fileUrl: string;
  storageKey: string;
  resourceType: MediaResourceType;
  mimeType?: string;
  fileSize?: number;
  questionId?: string | null;
  questionGroupId?: string | null;
}

export interface UpdateMediaTargetDto {
  questionId?: string | null;
  questionGroupId?: string | null;
}

export interface MediaResource {
  id: string;
  fileName: string;
  fileUrl: string;
  resourceType: MediaResourceType;
  mimeType: string;
  fileSize: number;
  questionId: string | null;
  questionGroupId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const MEDIA_LIMITS_CONFIG = {
  AUDIO: {
    MAX_SIZE_BYTES: 15 * 1024 * 1024, // 15MB
    ALLOWED_MIME_TYPES: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav'],
    ALLOWED_EXTENSIONS: ['.mp3', '.wav'],
  },
  IMAGE: {
    MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
    ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  BATCH: {
    MIN_ITEMS: 1,
    MAX_ITEMS: 10,
  },
} as const;
