import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { AudioPlayer } from './audio-player';

describe('AudioPlayer Component', () => {
  let playStub: ReturnType<typeof vi.fn>;
  let pauseStub: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    playStub = vi.fn().mockImplementation(() => Promise.resolve());
    pauseStub = vi.fn();
    window.HTMLMediaElement.prototype.play = playStub as unknown as () => Promise<void>;
    window.HTMLMediaElement.prototype.pause = pauseStub as unknown as () => void;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders audio player with controls and duration', () => {
    render(<AudioPlayer src="https://storage.example.com/audio.mp3" title="Part 1 Audio" />);

    expect(screen.getByText('Part 1 Audio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^phát audio$/i })).toBeInTheDocument();
    expect(screen.getByText('1.0x')).toBeInTheDocument();
  });

  it('toggles play and pause on button click', async () => {
    render(<AudioPlayer src="https://storage.example.com/audio.mp3" />);

    const playBtn = screen.getByRole('button', { name: /^phát audio$/i });

    await act(async () => {
      fireEvent.click(playBtn);
    });

    expect(playStub).toHaveBeenCalled();

    // Simulate audio is now playing
    const audioEl = document.querySelector('audio');
    if (audioEl) {
      fireEvent.play(audioEl);
    }

    const pauseBtn = screen.getByRole('button', { name: /^tạm dừng audio$/i });
    expect(pauseBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(pauseBtn);
    });

    expect(pauseStub).toHaveBeenCalled();
  });

  it('changes playback speed when speed button is clicked', async () => {
    render(<AudioPlayer src="https://storage.example.com/audio.mp3" />);

    const speedBtn = screen.getByRole('button', { name: /tốc độ.*1\.0x/i });
    await act(async () => {
      fireEvent.click(speedBtn);
    });

    // Cycles to 1.25x
    expect(screen.getByText('1.25x')).toBeInTheDocument();
  });

  it('skips forward and backward 5 seconds', async () => {
    render(<AudioPlayer src="https://storage.example.com/audio.mp3" />);

    const audioEl = document.querySelector('audio');
    if (audioEl) {
      Object.defineProperty(audioEl, 'duration', { value: 60, writable: true });
      Object.defineProperty(audioEl, 'currentTime', { value: 10, writable: true });
    }

    const skipForwardBtn = screen.getByRole('button', { name: /tua tiến 5s|\+5s/i });
    await act(async () => {
      fireEvent.click(skipForwardBtn);
    });

    expect(audioEl?.currentTime).toBe(15);

    const skipBackwardBtn = screen.getByRole('button', { name: /tua lùi 5s|-5s/i });
    await act(async () => {
      fireEvent.click(skipBackwardBtn);
    });

    expect(audioEl?.currentTime).toBe(10);
  });

  it('cleans up audio on unmount to prevent memory leaks (PM Point 2)', () => {
    const { unmount } = render(<AudioPlayer src="https://storage.example.com/audio.mp3" />);

    unmount();

    expect(pauseStub).toHaveBeenCalled();
  });

  it('renders compact variant appropriately', () => {
    render(
      <AudioPlayer
        src="https://storage.example.com/audio.mp3"
        variant="compact"
        fileName="track.mp3"
      />,
    );

    expect(screen.getByRole('button', { name: /^phát audio$/i })).toBeInTheDocument();
    expect(screen.getByText('1.0x')).toBeInTheDocument();
  });
});
