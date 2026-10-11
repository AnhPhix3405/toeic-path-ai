import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ImageLightbox } from './image-lightbox';

describe('ImageLightbox Component', () => {
  const sampleSrc = 'https://storage.example.com/part1-photo.jpg';

  it('renders thumbnail with filename and metadata badge', () => {
    render(
      <ImageLightbox
        src={sampleSrc}
        alt="TOEIC Part 1 Photo"
        fileName="part1-photo.jpg"
        fileSize={1048576}
        showMetadataBadge
      />,
    );

    expect(screen.getByText('part1-photo.jpg')).toBeInTheDocument();
    expect(screen.getByText(/1\.0 MB/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /phóng to ảnh/i })).toBeInTheDocument();
  });

  it('opens modal dialog when thumbnail is clicked', () => {
    render(
      <ImageLightbox
        src={sampleSrc}
        alt="TOEIC Part 1 Photo"
        fileName="part1-photo.jpg"
      />,
    );

    const triggerBtn = screen.getByRole('button', { name: /phóng to ảnh/i });
    fireEvent.click(triggerBtn);

    // Dialog content should now be in the DOM
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /phóng to \(\+25%\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thu nhỏ \(-25%\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /đặt lại thu phóng/i })).toBeInTheDocument();
  });

  it('adjusts zoom level when zoom in, zoom out, and reset are clicked', () => {
    render(
      <ImageLightbox
        src={sampleSrc}
        alt="TOEIC Part 1 Photo"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /phóng to ảnh/i }));

    const zoomInBtn = screen.getByRole('button', { name: /phóng to \(\+25%\)/i });
    const zoomOutBtn = screen.getByRole('button', { name: /thu nhỏ \(-25%\)/i });
    const resetBtn = screen.getByRole('button', { name: /đặt lại thu phóng/i });

    // Initial zoom is 100%
    expect(screen.getByText('100%')).toBeInTheDocument();

    fireEvent.click(zoomInBtn);
    expect(screen.getByText('125%')).toBeInTheDocument();

    fireEvent.click(zoomInBtn);
    expect(screen.getByText('150%')).toBeInTheDocument();

    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('125%')).toBeInTheDocument();

    fireEvent.click(resetBtn);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('closes dialog when close button is clicked', () => {
    render(
      <ImageLightbox
        src={sampleSrc}
        alt="TOEIC Part 1 Photo"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /phóng to ảnh/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /đóng xem ảnh/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays fallback state when image fails to load', () => {
    render(<ImageLightbox src="https://storage.example.com/broken.png" />);

    const img = screen.getByRole('img');
    fireEvent.error(img);

    expect(screen.getByText(/không thể tải hình ảnh/i)).toBeInTheDocument();
  });
});
