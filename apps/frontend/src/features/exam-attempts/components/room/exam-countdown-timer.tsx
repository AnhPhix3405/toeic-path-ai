"use client";

import React, { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExamCountdownTimerProps {
  expiresAt: string;
  serverTimeOffsetMs: number;
  isForceExpired?: boolean;
  onExpire: () => void;
  className?: string;
}

function computeRemainingSeconds(
  expiresAt: string,
  serverTimeOffsetMs: number
): number {
  const expiresMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresMs)) return 0;
  const serverNowMs = Date.now() + serverTimeOffsetMs;
  return Math.max(0, Math.floor((expiresMs - serverNowMs) / 1000));
}

function formatTimerDisplay(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function ExamCountdownTimer({
  expiresAt,
  serverTimeOffsetMs,
  isForceExpired = false,
  onExpire,
  className,
}: ExamCountdownTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    isForceExpired
      ? 0
      : computeRemainingSeconds(expiresAt, serverTimeOffsetMs)
  );
  const hasExpiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (isForceExpired) {
      setRemainingSeconds(0);
      if (!hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpireRef.current();
      }
      return;
    }

    const tick = () => {
      const next = computeRemainingSeconds(expiresAt, serverTimeOffsetMs);
      setRemainingSeconds(next);
      if (next <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpireRef.current();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, serverTimeOffsetMs, isForceExpired]);

  const isCritical = remainingSeconds > 0 && remainingSeconds < 60;
  const isWarning = remainingSeconds >= 60 && remainingSeconds < 300;
  const isZero = remainingSeconds <= 0;

  return (
    <div
      role="timer"
      aria-label="Thời gian làm bài còn lại"
      aria-live={isWarning || isCritical ? "polite" : "off"}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-sm font-bold tabular-nums transition-colors",
        isZero || isCritical
          ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse"
          : isWarning
          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
          : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700",
        className
      )}
    >
      <Clock className="w-4 h-4 shrink-0" />
      <span>{formatTimerDisplay(remainingSeconds)}</span>
    </div>
  );
}
