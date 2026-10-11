import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MediaUploadDropzone } from './media-upload-dropzone';
import { mediaService } from '@/services/media.service';
import { toast } from 'sonner';

vi.mock('@/services/media.service', () => ({
  mediaService: {
    validateMediaFile: vi.fn(),
    orchestratedUploadFlow: vi.fn(),
  },
  MEDIA_LIMITS_CONFIG: {
    AUDIO: {
      MAX_SIZE_BYTES: 15 * 1024 * 1024,
      ALLOWED_EXTENSIONS: ['.mp3', '.wav'],
    },
    IMAGE: {
      MAX_SIZE_BYTES: 5 * 1024 * 1024,
      ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
    },
    BATCH: {
      MAX_ITEMS: 10,
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('MediaUploadDropzone Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dropzone with format guidance and quota', () => {
    render(<MediaUploadDropzone acceptType="all" />);

    expect(screen.getByText(/kéo thả tệp vào đây/i)).toBeInTheDocument();
    expect(screen.getByText(/audio ≤ 15mb/i)).toBeInTheDocument();
    expect(screen.getByText(/hình ảnh ≤ 5mb/i)).toBeInTheDocument();
  });

  it('rejects invalid file format and shows error toast', async () => {
    vi.mocked(mediaService.validateMediaFile).mockReturnValueOnce({
      isValid: false,
      error: 'Định dạng tệp không hợp lệ.',
    });

    render(<MediaUploadDropzone acceptType="audio" />);

    const file = new File(['bad'], 'document.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('media-file-input');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Định dạng tệp không hợp lệ.');
    });
    expect(mediaService.orchestratedUploadFlow).not.toHaveBeenCalled();
  });

  it('uploads valid file and triggers onUploadSuccess callback', async () => {
    vi.mocked(mediaService.validateMediaFile).mockReturnValueOnce({ isValid: true });
    vi.mocked(mediaService.orchestratedUploadFlow).mockResolvedValueOnce({
      id: 'm-1',
      fileName: 'listening.mp3',
      fileUrl: 'https://storage.example.com/listening.mp3',
      resourceType: 'audio',
      mimeType: 'audio/mpeg',
      fileSize: 1048576,
      questionId: 'q-1',
      questionGroupId: null,
      createdBy: 'u-1',
      createdAt: '2026-10-11T12:00:00Z',
      updatedAt: '2026-10-11T12:00:00Z',
    });

    const onUploadSuccess = vi.fn();
    render(
      <MediaUploadDropzone
        acceptType="audio"
        target={{ questionId: 'q-1' }}
        onUploadSuccess={onUploadSuccess}
      />,
    );

    const file = new File(['good audio'], 'listening.mp3', { type: 'audio/mpeg' });
    const input = screen.getByTestId('media-file-input');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mediaService.orchestratedUploadFlow).toHaveBeenCalledWith(
        file,
        expect.objectContaining({
          target: { questionId: 'q-1' },
        }),
      );
      expect(onUploadSuccess).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Tải lên thành công'));
    });
  });

  it('renders disabled state with disabledReason message', () => {
    render(
      <MediaUploadDropzone
        disabled
        disabledReason="Không thể tải thêm tài nguyên khi câu hỏi đã xuất bản."
      />,
    );

    expect(
      screen.getByText('Không thể tải thêm tài nguyên khi câu hỏi đã xuất bản.'),
    ).toBeInTheDocument();
    const input = screen.getByTestId('media-file-input');
    expect(input).toBeDisabled();
  });
});
