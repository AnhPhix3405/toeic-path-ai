'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Gauge,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface AudioPlayerProps {
  src: string;
  title?: string;
  fileName?: string;
  autoPlay?: boolean;
  variant?: 'standard' | 'compact';
  className?: string;
  onError?: (err: Error) => void;
}

const PLAYBACK_SPEEDS = [0.75, 1.0, 1.25, 1.5];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatSpeed(speed: number): string {
  return Number.isInteger(speed) ? `${speed}.0x` : `${speed}x`;
}

export function AudioPlayer({
  src,
  title,
  fileName,
  autoPlay = false,
  variant = 'standard',
  className,
  onError,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeedIndex, setPlaybackSpeedIndex] = useState(1); // 1.0x
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const currentSpeed = PLAYBACK_SPEEDS[playbackSpeedIndex];
  const speedLabel = formatSpeed(currentSpeed);

  // Cleanup audio element on unmount or src change to prevent memory leaks (PM Point 2)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setHasError(false);

    if (src && audio.src !== src) {
      audio.src = src;
    }
    audio.playbackRate = currentSpeed;

    if (audio.readyState >= 1) {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      if (!src || !audio.src) return;
      setHasError(true);
      setIsLoading(false);
      setIsPlaying(false);
      onError?.(new Error('Không thể tải hoặc phát tệp âm thanh'));
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [src, currentSpeed, onError]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      try {
        if (hasError) {
          setHasError(false);
          if (audio.src !== src) {
            audio.src = src;
          }
          audio.load();
        }
        await audio.play();
      } catch (err) {
        setIsPlaying(false);
      }
    }
  }, [isPlaying, hasError, src]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleSkip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const maxDuration = audio.duration || duration || Infinity;
    const newTime = Math.max(0, Math.min(audio.currentTime + seconds, maxDuration));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cycleSpeed = () => {
    const nextIndex = (playbackSpeedIndex + 1) % PLAYBACK_SPEEDS.length;
    setPlaybackSpeedIndex(nextIndex);
    const newSpeed = PLAYBACK_SPEEDS[nextIndex];
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audio.muted = nextMuted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
    }
  };

  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm',
          className,
        )}
        role="alert"
      >
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Lỗi tải âm thanh</p>
          <p className="text-xs opacity-80">
            Không thể tải tệp âm thanh. Vui lòng kiểm tra liên kết hoặc kết nối mạng.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setHasError(false);
            if (audioRef.current) {
              audioRef.current.src = src;
              audioRef.current.load();
            }
          }}
        >
          Thử lại
        </Button>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-2 px-3 rounded-lg border bg-card/60 backdrop-blur text-card-foreground shadow-xs',
          className,
        )}
        role="region"
        aria-label="Trình phát âm thanh thu gọn"
      >
        <audio
          ref={audioRef}
          src={src}
          autoPlay={autoPlay}
          preload="metadata"
          crossOrigin="anonymous"
        />

        <Button
          type="button"
          size="icon"
          variant="default"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Tạm dừng audio' : 'Phát audio'}
          disabled={isLoading}
          className="h-7 w-7"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5 ml-0.5" />
          )}
        </Button>

        <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            aria-label="Thanh thời gian âm thanh"
          />
          <span className="text-[11px] tabular-nums font-mono text-muted-foreground whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={cycleSpeed}
          className="h-6 px-1.5 text-xs font-mono font-medium"
          aria-label={`Tốc độ: ${speedLabel}`}
        >
          {speedLabel}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 shadow-xs space-y-3 transition-colors',
        className,
      )}
      role="region"
      aria-label="Trình phát âm thanh TOEIC"
    >
      <audio
        ref={audioRef}
        src={src}
        autoPlay={autoPlay}
        preload="metadata"
        crossOrigin="anonymous"
      />

      {/* Header Info */}
      {(title || fileName) && (
        <div className="flex items-center justify-between gap-2 border-b pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-semibold shrink-0">
              MP3
            </span>
            <p className="text-sm font-medium truncate text-foreground">
              {title || fileName}
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground shrink-0 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      )}

      {/* Scrubbing Bar */}
      <div className="space-y-1">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary transition-all hover:h-2.5"
            aria-label="Tiến trình phát âm thanh"
          />
        </div>
        {!title && !fileName && (
          <div className="flex justify-between text-[11px] font-mono text-muted-foreground tabular-nums px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        )}
      </div>

      {/* Main Controls Toolbar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {/* Playback speed toggle */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={cycleSpeed}
            className="h-8 px-2.5 text-xs font-mono font-semibold gap-1.5"
            aria-label={`Tốc độ: ${speedLabel}`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>{speedLabel}</span>
          </Button>
        </div>

        {/* Core Controls: Skip Back, Play/Pause, Skip Forward */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => handleSkip(-5)}
            aria-label="Tua lùi 5s"
            title="Tua lùi 5s"
            className="h-8 w-8"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            size="icon"
            variant="default"
            onClick={togglePlay}
            disabled={isLoading}
            className="rounded-full w-10 h-10 shadow-sm"
            aria-label={isPlaying ? 'Tạm dừng audio' : 'Phát audio'}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => handleSkip(5)}
            aria-label="Tua tiến 5s"
            title="Tua tiến 5s"
            className="h-8 w-8"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Volume & Mute control */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={toggleMute}
            aria-label={isMuted ? 'Bật âm lượng' : 'Tắt tiếng'}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-muted rounded appearance-none cursor-pointer accent-primary"
            aria-label="Điều chỉnh âm lượng"
          />
        </div>
      </div>
    </div>
  );
}
