import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useQuestionMedia,
  useQuestionGroupMedia,
  useMediaDetail,
  useUploadMedia,
  useDeleteMedia,
  useUpdateMediaTarget,
} from './use-media';
import { mediaService } from '@/services/media.service';
import type { MediaResource } from '@/types/media';

vi.mock('@/services/media.service', () => ({
  mediaService: {
    getMediaByQuestionId: vi.fn(),
    getMediaByQuestionGroupId: vi.fn(),
    getMediaById: vi.fn(),
    orchestratedUploadFlow: vi.fn(),
    deleteMedia: vi.fn(),
    updateTarget: vi.fn(),
  },
}));

const mockMedia: MediaResource = {
  id: 'media-1',
  fileName: 'test.mp3',
  fileUrl: 'https://storage.example.com/test.mp3',
  resourceType: 'audio',
  mimeType: 'audio/mpeg',
  fileSize: 1048576,
  questionId: 'q-1',
  questionGroupId: null,
  createdBy: 'user-1',
  createdAt: '2026-10-11T12:00:00Z',
  updatedAt: '2026-10-11T12:00:00Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('use-media hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useQuestionMedia', () => {
    it('lấy danh sách media cho câu hỏi thành công', async () => {
      vi.mocked(mediaService.getMediaByQuestionId).mockResolvedValueOnce([mockMedia]);

      const { result } = renderHook(() => useQuestionMedia('q-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([mockMedia]);
      expect(mediaService.getMediaByQuestionId).toHaveBeenCalledWith('q-1');
    });

    it('không gọi API khi questionId không có giá trị', () => {
      const { result } = renderHook(() => useQuestionMedia(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mediaService.getMediaByQuestionId).not.toHaveBeenCalled();
    });
  });

  describe('useQuestionGroupMedia', () => {
    it('lấy danh sách media cho nhóm câu hỏi thành công', async () => {
      vi.mocked(mediaService.getMediaByQuestionGroupId).mockResolvedValueOnce([mockMedia]);

      const { result } = renderHook(() => useQuestionGroupMedia('group-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([mockMedia]);
      expect(mediaService.getMediaByQuestionGroupId).toHaveBeenCalledWith('group-1');
    });
  });

  describe('useMediaDetail', () => {
    it('lấy chi tiết media theo id thành công', async () => {
      vi.mocked(mediaService.getMediaById).mockResolvedValueOnce(mockMedia);

      const { result } = renderHook(() => useMediaDetail('media-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockMedia);
      expect(mediaService.getMediaById).toHaveBeenCalledWith('media-1');
    });
  });

  describe('useUploadMedia', () => {
    it('thực hiện mutation upload và invalidate query keys', async () => {
      vi.mocked(mediaService.orchestratedUploadFlow).mockResolvedValueOnce(mockMedia);

      const { result } = renderHook(() => useUploadMedia(), {
        wrapper: createWrapper(),
      });

      const fakeFile = new File(['audio'], 'sample.mp3', { type: 'audio/mpeg' });
      await result.current.mutateAsync({
        file: fakeFile,
        target: { questionId: 'q-1' },
      });

      expect(mediaService.orchestratedUploadFlow).toHaveBeenCalledWith(fakeFile, {
        target: { questionId: 'q-1' },
        onProgress: undefined,
      });
    });
  });

  describe('useDeleteMedia', () => {
    it('thực hiện mutation xóa media', async () => {
      vi.mocked(mediaService.deleteMedia).mockResolvedValueOnce();

      const { result } = renderHook(() => useDeleteMedia(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync('media-1');

      expect(mediaService.deleteMedia).toHaveBeenCalledWith('media-1');
    });
  });

  describe('useUpdateMediaTarget', () => {
    it('thực hiện mutation gán lại target', async () => {
      vi.mocked(mediaService.updateTarget).mockResolvedValueOnce(mockMedia);

      const { result } = renderHook(() => useUpdateMediaTarget(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        id: 'media-1',
        dto: { questionId: 'q-2' },
      });

      expect(mediaService.updateTarget).toHaveBeenCalledWith('media-1', { questionId: 'q-2' });
    });
  });
});
