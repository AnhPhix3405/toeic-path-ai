"use client";

import React, { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExamAudioPlayerProps {
  src: string;
  label?: string;
  compact?: boolean;
  className?: string;
}

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function ExamAudioPlayer({
  src,
  label = "Âm thanh bài nghe TOEIC",
  compact = false,
  className,
}: ExamAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [src]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
        setHasError(false);
      } catch {
        setHasError(true);
        setIsPlaying(false);
      }
    }
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const next = Number(e.target.value);
    if (audio && Number.isFinite(next)) {
      audio.currentTime = next;
      setCurrentTime(next);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/30",
        compact ? "p-2.5" : "p-3.5",
        className
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || 0);
          setHasError(false);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setHasError(true);
          setIsPlaying(false);
        }}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Tạm dừng âm thanh" : "Phát âm thanh"}
          className="h-9 w-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-indigo-950 dark:text-indigo-200 truncate">
              {label}
            </span>
            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 shrink-0">
              {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 100}
            step={0.5}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Thanh tiến trình âm thanh"
            className="w-full h-1.5 accent-indigo-600 cursor-pointer"
          />
        </div>

        <button
          type="button"
          onClick={handleRestart}
          aria-label="Nghe lại từ đầu"
          title="Nghe lại từ đầu"
          className="h-8 w-8 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
          title={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
          className="h-8 w-8 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-rose-500" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {hasError && (
        <p
          role="alert"
          className="mt-2 text-[11px] text-rose-600 dark:text-rose-400"
        >
          Không thể phát tệp âm thanh lúc này. Vui lòng kiểm tra kết nối mạng hoặc
          nhấn thử lại.
        </p>
      )}
    </div>
  );
}
