import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MediaAttachmentList } from './media-attachment-list';
import type { MediaResource } from '@/types/media';

const sampleAudio: MediaResource = {
  id: 'media-audio-1',
  fileName: 'listening_part1.mp3',
  fileUrl: 'https://storage.example.com/audio1.mp3',
  resourceType: 'audio',
  mimeType: 'audio/mpeg',
  fileSize: 1048576,
  questionId: 'q-1',
  questionGroupId: null,
  createdBy: 'u-1',
  createdAt: '2026-10-11T12:00:00Z',
  updatedAt: '2026-10-11T12:00:00Z',
};

const sampleImage: MediaResource = {
  id: 'media-image-1',
  fileName: 'photo_part1.png',
  fileUrl: 'https://storage.example.com/photo1.png',
  resourceType: 'image',
  mimeType: 'image/png',
  fileSize: 524288,
  questionId: 'q-1',
  questionGroupId: null,
  createdBy: 'u-1',
  createdAt: '2026-10-11T12:00:00Z',
  updatedAt: '2026-10-11T12:00:00Z',
};

describe('MediaAttachmentList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of media items with audio player and image thumbnail', () => {
    render(
      <MediaAttachmentList
        mediaItems={[sampleAudio, sampleImage]}
        parentStatus="draft"
      />,
    );

    expect(screen.getAllByText('listening_part1.mp3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('photo_part1.png').length).toBeGreaterThanOrEqual(1);
  });

  it('allows delete when parentStatus is draft or revision_requested (Whitelist Rule)', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);

    render(
      <MediaAttachmentList
        mediaItems={[sampleAudio]}
        parentStatus="draft"
        onDelete={onDelete}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: /xóa tài nguyên/i });
    expect(deleteBtn).not.toBeDisabled();

    fireEvent.click(deleteBtn);

    // Confirmation dialog appears
    const confirmBtn = screen.getByRole('button', { name: /xác nhận xóa/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith('media-audio-1');
    });
  });

  it('disables delete button and shows tooltip when parentStatus is published (Whitelist Rule BR13.4)', () => {
    render(
      <MediaAttachmentList
        mediaItems={[sampleAudio]}
        parentStatus="published"
        onDelete={vi.fn()}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: /xóa tài nguyên/i });
    expect(deleteBtn).toBeDisabled();
    expect(
      screen.getByTitle(/không thể sửa hoặc xóa tài nguyên khi câu hỏi đang chờ duyệt hoặc đã xuất bản/i),
    ).toBeInTheDocument();
  });

  it('disables delete button when parentStatus is pending_review', () => {
    render(
      <MediaAttachmentList
        mediaItems={[sampleAudio]}
        parentStatus="pending_review"
        onDelete={vi.fn()}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: /xóa tài nguyên/i });
    expect(deleteBtn).toBeDisabled();
  });
});
