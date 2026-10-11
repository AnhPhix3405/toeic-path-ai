import axios from 'axios';
import { apiClient } from './api-client';
import {
  type MediaResource,
  type MediaResourceType,
  type CreatePresignedUrlDto,
  type BatchPresignedUrlDto,
  type ConfirmMediaUploadDto,
  type UpdateMediaTargetDto,
  type PresignedUrlResult,
  type BatchPresignedUrlResult,
  MEDIA_LIMITS_CONFIG,
} from '@/types/media';

// Direct storage axios instance without backend auth interceptors
const storageDirectClient = axios.create();

/**
 * Helper to unwrap responses from apiClient.
 * Handles direct backend DTOs, direct arrays, as well as envelope structures ({ data: ... }).
 */
function unwrapResponse<T>(res: unknown): T {
  if (res === null || res === undefined) {
    return res as T;
  }
  if (Array.isArray(res)) {
    return res as T;
  }
  if (typeof res === 'object') {
    if ('data' in res && (res as { data: unknown }).data !== undefined) {
      return (res as { data: T }).data;
    }
  }
  return res as T;
}

/**
 * Standardize client MIME type to match backend whitelist (e.g. .jpg -> image/jpeg).
 */
function getCanonicalMimeType(
  fileName: string,
  clientMimeType: string,
  resourceType: MediaResourceType,
): string {
  const ext = '.' + fileName.split('.').pop()?.toLowerCase();
  if (resourceType === 'image') {
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
  } else if (resourceType === 'audio') {
    if (ext === '.mp3') return 'audio/mpeg';
    if (ext === '.wav') return 'audio/wav';
  }
  return clientMimeType || (resourceType === 'audio' ? 'audio/mpeg' : 'image/jpeg');
}

export const mediaService = {
  /**
   * Xin 1 Presigned URL tải lên trực tiếp Cloud Storage
   */
  async createPresignedUrl(dto: CreatePresignedUrlDto): Promise<PresignedUrlResult> {
    const response = await apiClient.post<PresignedUrlResult>('/media/presigned-url', dto);
    return unwrapResponse<PresignedUrlResult>(response);
  },

  /**
   * Xin hàng loạt Presigned URL (1–10 tệp)
   */
  async createBatchPresignedUrls(dto: BatchPresignedUrlDto): Promise<BatchPresignedUrlResult> {
    const response = await apiClient.post<BatchPresignedUrlResult>(
      '/media/presigned-url/batch',
      dto,
    );
    return unwrapResponse<BatchPresignedUrlResult>(response);
  },

  /**
   * Tải trực tiếp dữ liệu nhị phân lên Cloud Storage (S3 / Supabase)
   * Tuyệt đối không đính kèm Bearer token của hệ thống để tránh lỗi chữ ký 403.
   */
  async uploadDirectToStorage(
    uploadUrl: string,
    file: File | Blob,
    options?: {
      httpMethod?: 'PUT' | 'POST';
      headers?: Record<string, string>;
      onProgress?: (percent: number) => void;
    },
  ): Promise<void> {
    const method = options?.httpMethod || 'PUT';
    const headers = options?.headers || {};

    if (method === 'POST') {
      const formData = new FormData();
      formData.append('file', file);
      await storageDirectClient.post(uploadUrl, formData, {
        headers,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && options?.onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            options.onProgress(percent);
          }
        },
      });
    } else {
      await storageDirectClient.put(uploadUrl, file, {
        headers,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && options?.onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            options.onProgress(percent);
          }
        },
      });
    }
  },

  /**
   * Xác nhận tải lên thành công và lưu metadata vào Backend DB.
   * Lọc sạch payload chỉ gửi các trường hợp lệ theo Backend ConfirmMediaUploadDto.
   */
  async confirmUpload(dto: ConfirmMediaUploadDto): Promise<MediaResource> {
    const sanitizedPayload = {
      fileName: dto.fileName,
      fileUrl: dto.fileUrl,
      storageKey: dto.storageKey,
      resourceType: dto.resourceType,
      questionId: dto.questionId ?? null,
      questionGroupId: dto.questionGroupId ?? null,
    };

    const response = await apiClient.post<MediaResource>('/media/confirm', sanitizedPayload);
    return unwrapResponse<MediaResource>(response);
  },

  /**
   * Lấy chi tiết tài nguyên media theo ID
   */
  async getMediaById(id: string): Promise<MediaResource> {
    const response = await apiClient.get<MediaResource>(`/media/${id}`);
    return unwrapResponse<MediaResource>(response);
  },

  /**
   * Lấy danh sách tài nguyên media của câu hỏi
   */
  async getMediaByQuestionId(questionId: string): Promise<MediaResource[]> {
    const response = await apiClient.get<MediaResource[]>(`/media/question/${questionId}`);
    return unwrapResponse<MediaResource[]>(response) ?? [];
  },

  /**
   * Lấy danh sách tài nguyên media của nhóm câu hỏi
   */
  async getMediaByQuestionGroupId(groupId: string): Promise<MediaResource[]> {
    const response = await apiClient.get<MediaResource[]>(`/media/group/${groupId}`);
    return unwrapResponse<MediaResource[]>(response) ?? [];
  },

  /**
   * Gán hoặc chuyển đổi mục tiêu liên kết (questionId hoặc questionGroupId)
   */
  async updateTarget(id: string, dto: UpdateMediaTargetDto): Promise<MediaResource> {
    const response = await apiClient.patch<MediaResource>(`/media/${id}/target`, dto);
    return unwrapResponse<MediaResource>(response);
  },

  /**
   * Xóa mềm tài nguyên media
   */
  async deleteMedia(id: string): Promise<void> {
    await apiClient.delete(`/media/${id}`);
  },

  /**
   * Kiểm tra hạn ngạch và định dạng tệp phía Client
   */
  validateMediaFile(
    file: { name: string; size: number; type: string },
    expectedType?: MediaResourceType,
  ): { isValid: boolean; error?: string } {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isAudio =
      expectedType === 'audio' ||
      (MEDIA_LIMITS_CONFIG.AUDIO.ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
    const isImage =
      expectedType === 'image' ||
      (MEDIA_LIMITS_CONFIG.IMAGE.ALLOWED_EXTENSIONS as readonly string[]).includes(ext);

    if (expectedType === 'audio' || (!expectedType && isAudio)) {
      if (file.size > MEDIA_LIMITS_CONFIG.AUDIO.MAX_SIZE_BYTES) {
        return {
          isValid: false,
          error: `Dung lượng tệp audio (${(file.size / (1024 * 1024)).toFixed(1)} MB) vượt quá giới hạn tối đa cho phép (15 MB).`,
        };
      }
      const validMime = (
        MEDIA_LIMITS_CONFIG.AUDIO.ALLOWED_MIME_TYPES as readonly string[]
      ).includes(file.type);
      const validExt = (MEDIA_LIMITS_CONFIG.AUDIO.ALLOWED_EXTENSIONS as readonly string[]).includes(
        ext,
      );
      if (!validMime && !validExt) {
        return {
          isValid: false,
          error: `Định dạng tệp audio không hợp lệ. Chỉ chấp nhận các định dạng: ${MEDIA_LIMITS_CONFIG.AUDIO.ALLOWED_EXTENSIONS.join(', ')}.`,
        };
      }
      return { isValid: true };
    }

    if (expectedType === 'image' || (!expectedType && isImage)) {
      if (file.size > MEDIA_LIMITS_CONFIG.IMAGE.MAX_SIZE_BYTES) {
        return {
          isValid: false,
          error: `Dung lượng hình ảnh (${(file.size / (1024 * 1024)).toFixed(1)} MB) vượt quá giới hạn tối đa cho phép (5 MB).`,
        };
      }
      const validMime = (
        MEDIA_LIMITS_CONFIG.IMAGE.ALLOWED_MIME_TYPES as readonly string[]
      ).includes(file.type);
      const validExt = (MEDIA_LIMITS_CONFIG.IMAGE.ALLOWED_EXTENSIONS as readonly string[]).includes(
        ext,
      );
      if (!validMime && !validExt) {
        return {
          isValid: false,
          error: `Định dạng hình ảnh không hợp lệ. Chỉ chấp nhận các định dạng: ${MEDIA_LIMITS_CONFIG.IMAGE.ALLOWED_EXTENSIONS.join(', ')}.`,
        };
      }
      return { isValid: true };
    }

    return {
      isValid: false,
      error: 'Loại tệp không hợp lệ. Vui lòng chọn tệp Audio (.mp3, .wav) hoặc Hình ảnh (.jpg, .png, .webp).',
    };
  },

  /**
   * Luồng upload trực tiếp khép kín từ File -> Presigned URL -> Cloud Storage -> Confirm Backend
   */
  async orchestratedUploadFlow(
    file: File,
    options?: {
      target?: { questionId?: string | null; questionGroupId?: string | null };
      onProgress?: (percent: number) => void;
    },
  ): Promise<MediaResource> {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const resourceType: MediaResourceType = (
      MEDIA_LIMITS_CONFIG.AUDIO.ALLOWED_EXTENSIONS as readonly string[]
    ).includes(ext)
      ? 'audio'
      : 'image';

    const validation = this.validateMediaFile(file, resourceType);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const mimeType = getCanonicalMimeType(file.name, file.type, resourceType);

    // Step 1: Xin presigned URL
    const presigned = await this.createPresignedUrl({
      fileName: file.name,
      fileSize: file.size,
      mimeType,
      resourceType,
    });

    if (!presigned || !presigned.uploadUrl) {
      throw new Error('Không thể khởi tạo liên kết tải lên từ máy chủ (uploadUrl không hợp lệ).');
    }

    // Step 2: Upload trực tiếp lên Cloud Storage
    await this.uploadDirectToStorage(presigned.uploadUrl, file, {
      httpMethod: presigned.httpMethod || 'PUT',
      headers: {
        ...(presigned.requiredHeaders || {}),
        'Content-Type': mimeType,
      },
      onProgress: options?.onProgress,
    });

    // Step 3: Xác nhận với Backend
    const confirmed = await this.confirmUpload({
      fileName: file.name,
      fileUrl: presigned.publicUrl,
      storageKey: presigned.storageKey,
      resourceType,
      mimeType,
      fileSize: file.size,
      questionId: options?.target?.questionId ?? null,
      questionGroupId: options?.target?.questionGroupId ?? null,
    });

    return confirmed;
  },
};
